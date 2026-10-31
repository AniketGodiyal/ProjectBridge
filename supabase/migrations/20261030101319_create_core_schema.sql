/*
# ProjectBridge Core Schema — Multi-institution resource sharing platform

Creates the foundational relational schema for ProjectBridge: institutions (organizations),
user profiles, memberships, roles, institutional structure (departments, labs), resources,
availability, bookings, check-in/checkout, incidents, notifications, audit logs, saved projects,
and platform administration. All institution-owned records carry an `organization_id` foreign key
so RLS can enforce strict multi-tenant isolation.

Security: RLS enabled on every table. Grants scoped to `authenticated` (sign-in required app).
Policies enforce organization membership for reading org-scoped data. Ownership checks for
personal data. Platform admin rights gated by the `platform_admins` table only.
A helper function `user_org_ids()` returns the set of org IDs the current user belongs to.
*/

-- ============================================================
-- organizations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  org_type text NOT NULL DEFAULT 'university',
  city text,
  state text,
  website text,
  contact_email text,
  contact_phone text,
  description text,
  proposed_admin_email text,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','verified','rejected','suspended','active')),
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  working_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  booking_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- platform_admins
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- memberships
-- ============================================================
CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student'
    CHECK (role IN ('student','manager','institute_admin')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending','active','suspended','left')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- ============================================================
-- Helper: user_org_ids() — org IDs the current user can access
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM public.memberships
  WHERE user_id = auth.uid() AND status = 'active'
$$;

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  phone text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- invitations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'student'
    CHECK (role IN ('student','manager','institute_admin')),
  invited_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected','revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- departments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  head_user_id uuid REFERENCES auth.users(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- labs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  name text NOT NULL,
  location text,
  description text,
  capacity int NOT NULL DEFAULT 1,
  opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  manager_user_id uuid REFERENCES auth.users(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- resources
-- ============================================================
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lab_id uuid REFERENCES public.labs(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'equipment',
  description text,
  quantity int NOT NULL DEFAULT 1,
  available_quantity int NOT NULL DEFAULT 1,
  operational_status text NOT NULL DEFAULT 'operational'
    CHECK (operational_status IN ('operational','maintenance','retired','restricted')),
  specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  access_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_training text[] NOT NULL DEFAULT '{}',
  supervision_required boolean NOT NULL DEFAULT false,
  booking_duration_minutes int,
  is_published boolean NOT NULL DEFAULT false,
  owner_user_id uuid REFERENCES auth.users(id),
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- availability_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time text NOT NULL,
  end_time text NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.resources(id),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  purpose text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','waitlisted','cancelled',
                      'checked_in','overdue','return_pending','completed','disputed')),
  rejection_reason text,
  approval_user_id uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  checkin_at timestamptz,
  checkout_at timestamptz,
  return_condition text,
  initial_condition text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- checkin_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.checkin_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('checkin','checkout')),
  condition_notes text,
  accessories text,
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  performed_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- incidents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  resource_id uuid REFERENCES public.resources(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  reported_by uuid NOT NULL REFERENCES auth.users(id),
  incident_type text NOT NULL DEFAULT 'other'
    CHECK (incident_type IN ('damage','missing_accessories','late_return','safety','unauthorized_use','other')),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'reported'
    CHECK (status IN ('reported','under_review','awaiting_response','resolved','escalated')),
  resolution_notes text,
  reviewer_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'general',
  related_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  organization_id uuid REFERENCES public.organizations(id),
  resource_id uuid REFERENCES public.resources(id),
  booking_id uuid REFERENCES public.bookings(id),
  before_value jsonb,
  after_value jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- saved_projects
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id),
  title text NOT NULL,
  description text,
  input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  matches_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON public.memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_resources_org ON public.resources(organization_id);
CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_lab ON public.resources(lab_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_resource ON public.bookings(resource_id);
CREATE INDEX IF NOT EXISTS idx_bookings_org ON public.bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_org ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_org ON public.incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_availability_resource ON public.availability_rules(resource_id);

-- ============================================================
-- RLS enable
-- ============================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Grants
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.labs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkin_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_projects TO authenticated;
GRANT SELECT ON public.platform_admins TO authenticated;

-- ============================================================
-- Policies: profiles (self)
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- Policies: organizations
-- ============================================================
DROP POLICY IF EXISTS "orgs_select_member_or_public" ON public.organizations;
CREATE POLICY "orgs_select_member_or_public" ON public.organizations FOR SELECT
  TO authenticated USING (
    is_active = true
    OR id IN (SELECT public.user_org_ids())
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "orgs_insert_any" ON public.organizations;
CREATE POLICY "orgs_insert_any" ON public.organizations FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "orgs_update_admin" ON public.organizations;
CREATE POLICY "orgs_update_admin" ON public.organizations FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = organizations.id
        AND m.user_id = auth.uid() AND m.role = 'institute_admin'
    )
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = organizations.id
        AND m.user_id = auth.uid() AND m.role = 'institute_admin'
    )
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );

-- ============================================================
-- Policies: memberships
-- ============================================================
DROP POLICY IF EXISTS "memberships_select_org_member" ON public.memberships;
CREATE POLICY "memberships_select_org_member" ON public.memberships FOR SELECT
  TO authenticated USING (
    organization_id IN (SELECT public.user_org_ids())
    OR user_id = auth.uid()
  );
DROP POLICY IF EXISTS "memberships_insert_admin_self" ON public.memberships;
CREATE POLICY "memberships_insert_admin_self" ON public.memberships FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid() AND m.role IN ('institute_admin','manager')
    )
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "memberships_update_admin" ON public.memberships;
CREATE POLICY "memberships_update_admin" ON public.memberships FOR UPDATE
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid() AND m.role IN ('institute_admin','manager')
    )
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid() AND m.role IN ('institute_admin','manager')
    )
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "memberships_delete_admin" ON public.memberships;
CREATE POLICY "memberships_delete_admin" ON public.memberships FOR DELETE
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid() AND m.role IN ('institute_admin','manager')
    )
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );

-- ============================================================
-- Policies: invitations
-- ============================================================
DROP POLICY IF EXISTS "invitations_select_org" ON public.invitations;
CREATE POLICY "invitations_select_org" ON public.invitations FOR SELECT
  TO authenticated USING (
    organization_id IN (SELECT public.user_org_ids())
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
DROP POLICY IF EXISTS "invitations_insert_admin" ON public.invitations;
CREATE POLICY "invitations_insert_admin" ON public.invitations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.organization_id = invitations.organization_id
        AND m.user_id = auth.uid() AND m.role = 'institute_admin'
    )
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "invitations_update_admin" ON public.invitations;
CREATE POLICY "invitations_update_admin" ON public.invitations FOR UPDATE
  TO authenticated USING (
    organization_id IN (SELECT public.user_org_ids())
  ) WITH CHECK (
    organization_id IN (SELECT public.user_org_ids())
  );
DROP POLICY IF EXISTS "invitations_delete_admin" ON public.invitations;
CREATE POLICY "invitations_delete_admin" ON public.invitations FOR DELETE
  TO authenticated USING (
    organization_id IN (SELECT public.user_org_ids())
  );

-- ============================================================
-- Policies: departments
-- ============================================================
DROP POLICY IF EXISTS "depts_select_org" ON public.departments;
CREATE POLICY "depts_select_org" ON public.departments FOR SELECT
  TO authenticated USING (organization_id IN (SELECT public.user_org_ids()));
DROP POLICY IF EXISTS "depts_insert_org" ON public.departments;
CREATE POLICY "depts_insert_org" ON public.departments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = departments.organization_id AND m.user_id = auth.uid() AND m.role IN ('institute_admin','manager'))
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "depts_update_org" ON public.departments;
CREATE POLICY "depts_update_org" ON public.departments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = departments.organization_id AND m.user_id = auth.uid() AND m.role IN ('institute_admin','manager'))
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = departments.organization_id AND m.user_id = auth.uid() AND m.role IN ('institute_admin','manager'))
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "depts_delete_org" ON public.departments;
CREATE POLICY "depts_delete_org" ON public.departments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = departments.organization_id AND m.user_id = auth.uid() AND m.role = 'institute_admin')
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );

-- ============================================================
-- Policies: labs
-- ============================================================
DROP POLICY IF EXISTS "labs_select_org" ON public.labs;
CREATE POLICY "labs_select_org" ON public.labs FOR SELECT
  TO authenticated USING (organization_id IN (SELECT public.user_org_ids()));
DROP POLICY IF EXISTS "labs_insert_org" ON public.labs;
CREATE POLICY "labs_insert_org" ON public.labs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = labs.organization_id AND m.user_id = auth.uid() AND m.role IN ('institute_admin','manager'))
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "labs_update_org" ON public.labs;
CREATE POLICY "labs_update_org" ON public.labs FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = labs.organization_id AND m.user_id = auth.uid() AND m.role IN ('institute_admin','manager'))
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = labs.organization_id AND m.user_id = auth.uid() AND m.role IN ('institute_admin','manager'))
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "labs_delete_org" ON public.labs;
CREATE POLICY "labs_delete_org" ON public.labs FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = labs.organization_id AND m.user_id = auth.uid() AND m.role = 'institute_admin')
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );

-- ============================================================
-- Policies: resources
-- ============================================================
DROP POLICY IF EXISTS "resources_select_org" ON public.resources;
CREATE POLICY "resources_select_org" ON public.resources FOR SELECT
  TO authenticated USING (organization_id IN (SELECT public.user_org_ids()));
DROP POLICY IF EXISTS "resources_insert_org" ON public.resources;
CREATE POLICY "resources_insert_org" ON public.resources FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = resources.organization_id AND m.user_id = auth.uid() AND m.role IN ('institute_admin','manager'))
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "resources_update_org" ON public.resources;
CREATE POLICY "resources_update_org" ON public.resources FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = resources.organization_id AND m.user_id = auth.uid() AND m.role IN ('institute_admin','manager'))
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = resources.organization_id AND m.user_id = auth.uid() AND m.role IN ('institute_admin','manager'))
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "resources_delete_org" ON public.resources;
CREATE POLICY "resources_delete_org" ON public.resources FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = resources.organization_id AND m.user_id = auth.uid() AND m.role = 'institute_admin')
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );

-- ============================================================
-- Policies: availability_rules (inherit from resource org)
-- ============================================================
DROP POLICY IF EXISTS "avail_select_org" ON public.availability_rules;
CREATE POLICY "avail_select_org" ON public.availability_rules FOR SELECT
  TO authenticated USING (
    resource_id IN (
      SELECT r.id FROM public.resources r
      WHERE r.organization_id IN (SELECT public.user_org_ids())
    )
  );
DROP POLICY IF EXISTS "avail_insert_org" ON public.availability_rules;
CREATE POLICY "avail_insert_org" ON public.availability_rules FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = availability_rules.resource_id
        AND r.organization_id IN (SELECT public.user_org_ids())
        AND EXISTS (
          SELECT 1 FROM public.memberships m
          WHERE m.organization_id = r.organization_id AND m.user_id = auth.uid()
            AND m.role IN ('institute_admin','manager')
        )
    )
  );
DROP POLICY IF EXISTS "avail_update_org" ON public.availability_rules;
CREATE POLICY "avail_update_org" ON public.availability_rules FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = availability_rules.resource_id
        AND EXISTS (
          SELECT 1 FROM public.memberships m
          WHERE m.organization_id = r.organization_id AND m.user_id = auth.uid()
            AND m.role IN ('institute_admin','manager')
        )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = availability_rules.resource_id
        AND EXISTS (
          SELECT 1 FROM public.memberships m
          WHERE m.organization_id = r.organization_id AND m.user_id = auth.uid()
            AND m.role IN ('institute_admin','manager')
        )
    )
  );
DROP POLICY IF EXISTS "avail_delete_org" ON public.availability_rules;
CREATE POLICY "avail_delete_org" ON public.availability_rules FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = availability_rules.resource_id
        AND EXISTS (
          SELECT 1 FROM public.memberships m
          WHERE m.organization_id = r.organization_id AND m.user_id = auth.uid()
            AND m.role IN ('institute_admin','manager')
        )
    )
  );

-- ============================================================
-- Policies: bookings
-- ============================================================
DROP POLICY IF EXISTS "bookings_select_party" ON public.bookings;
CREATE POLICY "bookings_select_party" ON public.bookings FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT public.user_org_ids())
  );
DROP POLICY IF EXISTS "bookings_insert_self" ON public.bookings;
CREATE POLICY "bookings_insert_self" ON public.bookings FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (SELECT public.user_org_ids())
  );
DROP POLICY IF EXISTS "bookings_update_party" ON public.bookings;
CREATE POLICY "bookings_update_party" ON public.bookings FOR UPDATE
  TO authenticated USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT public.user_org_ids())
  ) WITH CHECK (
    user_id = auth.uid()
    OR organization_id IN (SELECT public.user_org_ids())
  );
DROP POLICY IF EXISTS "bookings_delete_self" ON public.bookings;
CREATE POLICY "bookings_delete_self" ON public.bookings FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- Policies: checkin_events
-- ============================================================
DROP POLICY IF EXISTS "checkin_select_org" ON public.checkin_events;
CREATE POLICY "checkin_select_org" ON public.checkin_events FOR SELECT
  TO authenticated USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.user_id = auth.uid() OR b.organization_id IN (SELECT public.user_org_ids())
    )
  );
DROP POLICY IF EXISTS "checkin_insert_org" ON public.checkin_events;
CREATE POLICY "checkin_insert_org" ON public.checkin_events FOR INSERT
  TO authenticated WITH CHECK (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.user_id = auth.uid() OR b.organization_id IN (SELECT public.user_org_ids())
    )
  );

-- ============================================================
-- Policies: incidents
-- ============================================================
DROP POLICY IF EXISTS "incidents_select_org" ON public.incidents;
CREATE POLICY "incidents_select_org" ON public.incidents FOR SELECT
  TO authenticated USING (
    organization_id IN (SELECT public.user_org_ids())
    OR reported_by = auth.uid()
  );
DROP POLICY IF EXISTS "incidents_insert_org" ON public.incidents;
CREATE POLICY "incidents_insert_org" ON public.incidents FOR INSERT
  TO authenticated WITH CHECK (
    reported_by = auth.uid()
    AND organization_id IN (SELECT public.user_org_ids())
  );
DROP POLICY IF EXISTS "incidents_update_org" ON public.incidents;
CREATE POLICY "incidents_update_org" ON public.incidents FOR UPDATE
  TO authenticated USING (
    organization_id IN (SELECT public.user_org_ids())
  ) WITH CHECK (
    organization_id IN (SELECT public.user_org_ids())
  );

-- ============================================================
-- Policies: notifications (self)
-- ============================================================
DROP POLICY IF EXISTS "notifs_select_self" ON public.notifications;
CREATE POLICY "notifs_select_self" ON public.notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notifs_insert_self" ON public.notifications;
CREATE POLICY "notifs_insert_self" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "notifs_update_self" ON public.notifications;
CREATE POLICY "notifs_update_self" ON public.notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "notifs_delete_self" ON public.notifications;
CREATE POLICY "notifs_delete_self" ON public.notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- Policies: audit_logs (read by org members; platform admins see all)
-- ============================================================
DROP POLICY IF EXISTS "audit_select_org" ON public.audit_logs;
CREATE POLICY "audit_select_org" ON public.audit_logs FOR SELECT
  TO authenticated USING (
    organization_id IN (SELECT public.user_org_ids())
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );

-- ============================================================
-- Policies: saved_projects (self)
-- ============================================================
DROP POLICY IF EXISTS "saved_select_self" ON public.saved_projects;
CREATE POLICY "saved_select_self" ON public.saved_projects FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "saved_insert_self" ON public.saved_projects;
CREATE POLICY "saved_insert_self" ON public.saved_projects FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "saved_update_self" ON public.saved_projects;
CREATE POLICY "saved_update_self" ON public.saved_projects FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "saved_delete_self" ON public.saved_projects;
CREATE POLICY "saved_delete_self" ON public.saved_projects FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- Policies: platform_admins (read by authenticated)
-- ============================================================
DROP POLICY IF EXISTS "pa_select_auth" ON public.platform_admins;
CREATE POLICY "pa_select_auth" ON public.platform_admins FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organizations_updated ON public.organizations;
CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_memberships_updated ON public.memberships;
CREATE TRIGGER trg_memberships_updated BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_departments_updated ON public.departments;
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_labs_updated ON public.labs;
CREATE TRIGGER trg_labs_updated BEFORE UPDATE ON public.labs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_resources_updated ON public.resources;
CREATE TRIGGER trg_resources_updated BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_bookings_updated ON public.bookings;
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_incidents_updated ON public.incidents;
CREATE TRIGGER trg_incidents_updated BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_saved_updated ON public.saved_projects;
CREATE TRIGGER trg_saved_updated BEFORE UPDATE ON public.saved_projects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();