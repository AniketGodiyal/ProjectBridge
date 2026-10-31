/*
# Demo mode foundation: fictional institution, personas, and read access

Adds the schema and read access that lets the app run without sign-in, against a
fictional demo institution. Writes are added in later migrations through
server-side functions that only touch records of the demo institution.

## 1. Schema additions (nothing dropped or retyped)
- organizations.is_demo: marks the fictional demonstration institution.
- profiles.roll_number, profiles.department_id: demo student details.
- bookings: approver assignment (assigned_approver_id, assigned_approver_role),
  routing (routing_source, routing_reason), decisions (decision_reason, decided_by,
  decided_at), claim (claimed_by, claimed_at), waitlist position (queue_position),
  return details (return_accessories, return_notes).
- demo_personas: maps each demo role (student, resource_manager, lab_manager,
  institute_admin, platform_admin) to a fictional profile.

## 2. Fictional identities
- Fixed-ID auth.users rows on the reserved domain demo.projectbridge.invalid. They have no
  usable password and cannot sign in. They keep foreign keys valid for future authentication.

## 3. Read access (anon + authenticated)
- Read policies only expose rows of the demo institution (organizations.is_demo).

## 4. Seed function
- demo_seed(): idempotent. Creates the fictional institution, personas, departments, labs,
  resources, and weekday availability only when they are missing.

## 5. Security notes
- RLS remains enabled on every table. Anonymous users get read access to demo rows only.
- This is demonstration-only access. It is not production authorization.
*/

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roll_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS assigned_approver_id uuid REFERENCES auth.users(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS assigned_approver_role text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS routing_source text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS routing_reason text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS decision_reason text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES auth.users(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS decided_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS claimed_by uuid REFERENCES auth.users(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS queue_position int;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS return_accessories text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS return_notes text;

CREATE TABLE IF NOT EXISTS public.demo_personas (
  persona_key text PRIMARY KEY CHECK (persona_key IN ('student','resource_manager','lab_manager','institute_admin','platform_admin')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.demo_personas ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.demo_personas TO anon, authenticated;
DROP POLICY IF EXISTS "demo_personas_select_all" ON public.demo_personas;
CREATE POLICY "demo_personas_select_all" ON public.demo_personas FOR SELECT
  TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.is_demo_org(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = org_id AND is_demo)
$$;

REVOKE EXECUTE ON FUNCTION public.is_demo_org(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_demo_org(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "demo_orgs_read" ON public.organizations;
CREATE POLICY "demo_orgs_read" ON public.organizations FOR SELECT
  TO anon, authenticated USING (is_demo);

DROP POLICY IF EXISTS "demo_depts_read" ON public.departments;
CREATE POLICY "demo_depts_read" ON public.departments FOR SELECT
  TO anon, authenticated USING (public.is_demo_org(organization_id));

DROP POLICY IF EXISTS "demo_labs_read" ON public.labs;
CREATE POLICY "demo_labs_read" ON public.labs FOR SELECT
  TO anon, authenticated USING (public.is_demo_org(organization_id));

DROP POLICY IF EXISTS "demo_resources_read" ON public.resources;
CREATE POLICY "demo_resources_read" ON public.resources FOR SELECT
  TO anon, authenticated USING (public.is_demo_org(organization_id));

DROP POLICY IF EXISTS "demo_avail_read" ON public.availability_rules;
CREATE POLICY "demo_avail_read" ON public.availability_rules FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.resources r WHERE r.id = availability_rules.resource_id AND public.is_demo_org(r.organization_id))
  );

DROP POLICY IF EXISTS "demo_bookings_read" ON public.bookings;
CREATE POLICY "demo_bookings_read" ON public.bookings FOR SELECT
  TO anon, authenticated USING (public.is_demo_org(organization_id));

DROP POLICY IF EXISTS "demo_checkin_read" ON public.checkin_events;
CREATE POLICY "demo_checkin_read" ON public.checkin_events FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = checkin_events.booking_id AND public.is_demo_org(b.organization_id))
  );

DROP POLICY IF EXISTS "demo_incidents_read" ON public.incidents;
CREATE POLICY "demo_incidents_read" ON public.incidents FOR SELECT
  TO anon, authenticated USING (public.is_demo_org(organization_id));

DROP POLICY IF EXISTS "demo_memberships_read" ON public.memberships;
CREATE POLICY "demo_memberships_read" ON public.memberships FOR SELECT
  TO anon, authenticated USING (public.is_demo_org(organization_id));

DROP POLICY IF EXISTS "demo_profiles_read" ON public.profiles;
CREATE POLICY "demo_profiles_read" ON public.profiles FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.demo_personas p WHERE p.user_id = profiles.id)
  );

GRANT SELECT ON public.organizations, public.departments, public.labs, public.resources,
  public.availability_rules, public.bookings, public.checkin_events, public.incidents,
  public.memberships, public.profiles TO anon;

CREATE OR REPLACE FUNCTION public.demo_seed()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id uuid;
  p_student uuid := 'd0000000-0000-4000-8000-000000000001';
  p_rm uuid := 'd0000000-0000-4000-8000-000000000002';
  p_lab uuid := 'd0000000-0000-4000-8000-000000000003';
  p_admin uuid := 'd0000000-0000-4000-8000-000000000004';
  p_platform uuid := 'd0000000-0000-4000-8000-000000000005';
  d_cse uuid; d_ece uuid; d_mech uuid;
  l_ai uuid; l_prog uuid; l_robot uuid; l_embed uuid; l_circuit uuid; l_mfg uuid; l_comp uuid;
  r_scope uuid;
BEGIN
  INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, encrypted_password)
  VALUES
    (p_student, 'authenticated', 'authenticated', 'demo.student@demo.projectbridge.invalid', now(), now(), now(), '{"provider":"demo","providers":["demo"]}', '{"demo":true}', ''),
    (p_rm, 'authenticated', 'authenticated', 'demo.resource.manager@demo.projectbridge.invalid', now(), now(), now(), '{"provider":"demo","providers":["demo"]}', '{"demo":true}', ''),
    (p_lab, 'authenticated', 'authenticated', 'demo.lab.manager@demo.projectbridge.invalid', now(), now(), now(), '{"provider":"demo","providers":["demo"]}', '{"demo":true}', ''),
    (p_admin, 'authenticated', 'authenticated', 'demo.institute.admin@demo.projectbridge.invalid', now(), now(), now(), '{"provider":"demo","providers":["demo"]}', '{"demo":true}', ''),
    (p_platform, 'authenticated', 'authenticated', 'demo.platform.admin@demo.projectbridge.invalid', now(), now(), now(), '{"provider":"demo","providers":["demo"]}', '{"demo":true}', '')
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO org_id FROM public.organizations WHERE is_demo LIMIT 1;
  IF org_id IS NULL THEN
    INSERT INTO public.organizations (name, org_type, city, state, contact_email, description, verification_status, is_active, is_demo)
    VALUES ('ProjectBridge Demo Engineering Institute (FICTIONAL DEMO)', 'university', 'Demo City', 'Demo State',
      'demo-admin@demo.projectbridge.invalid',
      'Fictional demonstration institution. All records are sample data for demonstration only.',
      'active', true, true)
    RETURNING id INTO org_id;
  END IF;

  INSERT INTO public.demo_personas (persona_key, user_id, label) VALUES
    ('student', p_student, 'Demo Student (fictional)'),
    ('resource_manager', p_rm, 'Demo Resource Manager (fictional)'),
    ('lab_manager', p_lab, 'Demo Faculty / Lab Manager (fictional)'),
    ('institute_admin', p_admin, 'Demo Institute Administrator (fictional)'),
    ('platform_admin', p_platform, 'Demo Platform Administrator (fictional)')
  ON CONFLICT (persona_key) DO NOTHING;

  INSERT INTO public.platform_admins (user_id) VALUES (p_platform) ON CONFLICT DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, roll_number, bio) VALUES
    (p_student, 'Demo Student [PLACEHOLDER]', '+00 00000 00000', 'DEMO-0001', 'Fictional demo student. Edit this profile with your own details.'),
    (p_rm, 'Demo Resource Manager [FICTIONAL]', '+00 00000 00002', NULL, 'Fictional demo resource manager.'),
    (p_lab, 'Dr. Demo Faculty [FICTIONAL]', '+00 00000 00003', NULL, 'Fictional demo faculty and lab manager.'),
    (p_admin, 'Demo Institute Administrator [FICTIONAL]', '+00 00000 00004', NULL, 'Fictional demo administrator.'),
    (p_platform, 'Demo Platform Administrator [FICTIONAL]', '+00 00000 00005', NULL, 'Fictional demo platform administrator.')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.memberships (user_id, organization_id, role, status) VALUES
    (p_student, org_id, 'student', 'active'),
    (p_rm, org_id, 'manager', 'active'),
    (p_lab, org_id, 'manager', 'active'),
    (p_admin, org_id, 'institute_admin', 'active')
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  INSERT INTO public.departments (organization_id, name, description)
  SELECT org_id, v.name, 'Fictional demo department.'
  FROM (VALUES ('Computer Science Engineering'), ('Electronics and Communication Engineering'),
    ('Mechanical Engineering'), ('Electrical Engineering')) AS v(name)
  WHERE NOT EXISTS (SELECT 1 FROM public.departments d WHERE d.organization_id = org_id AND d.name = v.name);

  SELECT id INTO d_cse FROM public.departments WHERE organization_id = org_id AND name = 'Computer Science Engineering';
  SELECT id INTO d_ece FROM public.departments WHERE organization_id = org_id AND name = 'Electronics and Communication Engineering';
  SELECT id INTO d_mech FROM public.departments WHERE organization_id = org_id AND name = 'Mechanical Engineering';

  INSERT INTO public.labs (organization_id, department_id, name, location, description, capacity, manager_user_id, opening_hours)
  SELECT org_id, v.dept, v.name, v.loc, 'Fictional demo laboratory.', v.cap, v.mgr, '{"weekdays":"09:00-17:00"}'::jsonb
  FROM (VALUES
    (d_cse, 'AI and Machine Learning Lab', 'Block A, Room 101', 20, p_lab),
    (d_cse, 'Programming Lab', 'Block A, Room 102', 60, NULL::uuid),
    (d_cse, 'Computer Lab', 'Block A, Room 104', 40, NULL::uuid),
    (d_ece, 'Robotics Lab', 'Block B, Room 201', 15, p_lab),
    (d_ece, 'Embedded Systems Lab', 'Block B, Room 203', 25, p_lab),
    (d_ece, 'Electronics Circuit Lab', 'Block B, Room 205', 30, p_lab),
    (d_mech, 'Manufacturing Lab', 'Block C, Ground Floor', 15, NULL::uuid),
    (d_mech, 'CAD/CAM Lab', 'Block C, Room 110', 30, NULL::uuid)
  ) AS v(dept, name, loc, cap, mgr)
  WHERE NOT EXISTS (SELECT 1 FROM public.labs l WHERE l.organization_id = org_id AND l.name = v.name);

  SELECT id INTO l_ai FROM public.labs WHERE organization_id = org_id AND name = 'AI and Machine Learning Lab';
  SELECT id INTO l_prog FROM public.labs WHERE organization_id = org_id AND name = 'Programming Lab';
  SELECT id INTO l_comp FROM public.labs WHERE organization_id = org_id AND name = 'Computer Lab';
  SELECT id INTO l_robot FROM public.labs WHERE organization_id = org_id AND name = 'Robotics Lab';
  SELECT id INTO l_embed FROM public.labs WHERE organization_id = org_id AND name = 'Embedded Systems Lab';
  SELECT id INTO l_circuit FROM public.labs WHERE organization_id = org_id AND name = 'Electronics Circuit Lab';
  SELECT id INTO l_mfg FROM public.labs WHERE organization_id = org_id AND name = 'Manufacturing Lab';

  INSERT INTO public.resources (organization_id, lab_id, department_id, name, category, description, quantity, available_quantity, operational_status, specifications, access_rules, required_training, supervision_required, booking_duration_minutes, is_published, owner_user_id)
  SELECT org_id, v.lab, v.dept, v.name, v.cat, v.descr, v.qty, v.qty, v.status, v.specs::jsonb, v.access::jsonb,
    CASE WHEN v.training THEN ARRAY['Lab safety induction'] ELSE '{}'::text[] END, v.supervised, v.dur, true, v.owner
  FROM (VALUES
    (l_embed, d_ece, 'Arduino-compatible boards (fictional)', 'equipment', 'Microcontroller boards for embedded prototypes.', 10, 'operational', '{"model":"Demo UNO-compatible"}', '{"eligible":"Students in ECE or CSE"}', false, false, 180, NULL::uuid),
    (l_embed, d_ece, 'IR sensors (fictional)', 'equipment', 'Infrared proximity sensor modules.', 20, 'operational', '{"range":"2-30 cm"}', '{"eligible":"All students"}', false, false, 120, NULL::uuid),
    (l_circuit, d_ece, 'Digital oscilloscopes (fictional)', 'equipment', '100 MHz digital storage oscilloscope.', 3, 'operational', '{"bandwidth":"100 MHz","channels":4}', '{"eligible":"Students who completed lab induction"}', true, true, 120, NULL::uuid),
    (l_circuit, d_ece, 'Multimeters (fictional)', 'equipment', 'Handheld digital multimeters.', 8, 'operational', '{"measures":"V, A, ohm"}', '{"eligible":"All students"}', false, false, 240, NULL::uuid),
    (l_circuit, d_ece, 'Soldering stations (fictional)', 'equipment', 'Temperature-controlled soldering stations.', 4, 'operational', '{"temperature":"200-450 C"}', '{"eligible":"Students who completed lab induction"}', true, true, 120, NULL::uuid),
    (l_mfg, d_mech, '3D printers (fictional)', 'equipment', 'FDM 3D printers for prototyping.', 2, 'maintenance', '{"build_volume":"220x220x250 mm"}', '{"eligible":"Students with CAD/CAM induction"}', true, true, 240, NULL::uuid),
    (l_comp, d_cse, 'DSLR cameras (fictional)', 'equipment', 'DSLR cameras for media projects.', 2, 'operational', '{"sensor":"APS-C"}', '{"eligible":"All students"}', false, false, 180, NULL::uuid),
    (l_comp, d_cse, 'Tripods (fictional)', 'equipment', 'Lightweight camera tripods.', 3, 'operational', '{}', '{"eligible":"All students"}', false, false, 240, NULL::uuid),
    (l_comp, d_cse, 'Microphones (fictional)', 'equipment', 'Condenser microphones for recording.', 4, 'operational', '{"type":"Condenser"}', '{"eligible":"All students"}', false, false, 180, NULL::uuid),
    (l_prog, d_cse, 'Laptops (fictional)', 'equipment', 'Teaching laptops for coding sessions.', 15, 'operational', '{"ram":"16 GB"}', '{"eligible":"All students"}', false, false, 240, NULL::uuid),
    (l_ai, d_cse, 'Computer systems (fictional)', 'equipment', 'GPU workstations for ML experiments.', 30, 'operational', '{"gpu":"Demo GPU"}', '{"eligible":"Students with ML lab induction"}', false, false, 240, NULL::uuid),
    (NULL::uuid, d_cse, 'Projector (fictional)', 'equipment', 'Portable projector.', 1, 'operational', '{"lumens":"3000"}', '{"eligible":"All students"}', false, false, 120, NULL::uuid),
    (NULL::uuid, d_cse, 'Seminar room (fictional)', 'space', 'Seminar hall for 60 people.', 1, 'operational', '{"capacity":60}', '{"eligible":"Student groups"}', false, false, 120, NULL::uuid),
    (NULL::uuid, d_cse, 'Meeting room (fictional)', 'space', 'Small meeting room for 8 people.', 1, 'operational', '{"capacity":8}', '{"eligible":"All students"}', false, false, 60, NULL::uuid),
    (l_robot, d_ece, 'Robotics kit (fictional)', 'equipment', 'Robot arm kit, temporarily unavailable pending inspection.', 2, 'restricted', '{"dof":"5"}', '{"eligible":"Students with robotics induction"}', true, true, 120, NULL::uuid)
  ) AS v(lab, dept, name, cat, descr, qty, status, specs, access, training, supervised, dur, owner)
  WHERE NOT EXISTS (SELECT 1 FROM public.resources r WHERE r.organization_id = org_id AND r.name = v.name);

  SELECT id INTO r_scope FROM public.resources WHERE organization_id = org_id AND name = 'Digital oscilloscopes (fictional)';
  UPDATE public.resources SET owner_user_id = p_rm WHERE id = r_scope AND owner_user_id IS NULL;

  INSERT INTO public.availability_rules (resource_id, day_of_week, start_time, end_time, is_available)
  SELECT r.id, dow, '09:00', '17:00', true
  FROM public.resources r, generate_series(1, 5) AS dow
  WHERE r.organization_id = org_id
    AND NOT EXISTS (SELECT 1 FROM public.availability_rules a WHERE a.resource_id = r.id);

  RETURN 'Demo data is ready.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demo_seed() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_seed() TO anon;
