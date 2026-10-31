/*
# Demo Data Seed — Sample Institution for First-Run Experience

Creates a clearly-labeled demonstration institution with sample departments, labs, and resources.
All data is explicitly marked as demo/sample with "[DEMO]" in names.
*/

INSERT INTO public.organizations (name, org_type, city, state, website, contact_email, description, verification_status, is_active, timezone)
VALUES (
  '[DEMO] National Institute of Technology',
  'university',
  'Bangalore',
  'Karnataka',
  'https://demo-nit.example.edu',
  'demo@nit.example.edu',
  'This is a demonstration institution for testing ProjectBridge. Resources shown here are sample data, not verified real-world availability.',
  'active',
  true,
  'Asia/Kolkata'
)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  org_id uuid;
  dept_elec uuid;
  dept_rob uuid;
  lab_elec uuid;
  lab_rob uuid;
  lab_comp uuid;
  lab_sem uuid;
BEGIN
  SELECT id INTO org_id FROM public.organizations WHERE name = '[DEMO] National Institute of Technology' LIMIT 1;
  IF org_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.departments (organization_id, name, description, is_active)
  VALUES (org_id, 'Electronics Engineering', 'Electronics and embedded systems department', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.departments (organization_id, name, description, is_active)
  VALUES (org_id, 'Robotics & Automation', 'Robotics and automation department', true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO dept_elec FROM public.departments WHERE organization_id = org_id AND name = 'Electronics Engineering' LIMIT 1;
  SELECT id INTO dept_rob FROM public.departments WHERE organization_id = org_id AND name = 'Robotics & Automation' LIMIT 1;

  INSERT INTO public.labs (organization_id, department_id, name, location, description, capacity, is_active)
  VALUES (org_id, dept_elec, 'Electronics Lab', 'Block A, Room 101', 'Electronics prototyping and testing lab', 20, true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.labs (organization_id, department_id, name, location, description, capacity, is_active)
  VALUES (org_id, dept_rob, 'Robotics Lab', 'Block B, Room 205', 'Robotics assembly and testing lab', 15, true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.labs (organization_id, department_id, name, location, description, capacity, is_active)
  VALUES (org_id, dept_elec, 'Computer Lab', 'Block A, Room 102', 'General computing workstation lab', 30, true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.labs (organization_id, department_id, name, location, description, capacity, is_active)
  VALUES (org_id, dept_elec, 'Seminar Room', 'Block C, Room 301', 'Seminar and group discussion room', 40, true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO lab_elec FROM public.labs WHERE organization_id = org_id AND name = 'Electronics Lab' LIMIT 1;
  SELECT id INTO lab_rob FROM public.labs WHERE organization_id = org_id AND name = 'Robotics Lab' LIMIT 1;
  SELECT id INTO lab_comp FROM public.labs WHERE organization_id = org_id AND name = 'Computer Lab' LIMIT 1;
  SELECT id INTO lab_sem FROM public.labs WHERE organization_id = org_id AND name = 'Seminar Room' LIMIT 1;

  INSERT INTO public.resources (organization_id, lab_id, department_id, name, category, description, quantity, available_quantity, operational_status, specifications, is_published, booking_duration_minutes)
  VALUES (
    org_id, lab_elec, dept_elec, 'Digital Oscilloscope', 'testing',
    '4-channel digital oscilloscope for signal analysis. [DEMO] Sample resource.',
    2, 2, 'operational',
    '{"bandwidth": "100MHz", "channels": "4", "sample_rate": "1GSa/s"}'::jsonb,
    true, 240
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.resources (organization_id, lab_id, department_id, name, category, description, quantity, available_quantity, operational_status, specifications, is_published, booking_duration_minutes)
  VALUES (
    org_id, lab_elec, dept_elec, 'Digital Multimeter', 'testing',
    'High-precision digital multimeter for voltage, current, and resistance measurement. [DEMO] Sample resource.',
    5, 5, 'operational',
    '{"max_voltage": "1000V", "resolution": "0.001V", "true_rms": "yes"}'::jsonb,
    true, 120
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.resources (organization_id, lab_id, department_id, name, category, description, quantity, available_quantity, operational_status, specifications, is_published, booking_duration_minutes, supervision_required, required_training)
  VALUES (
    org_id, lab_rob, dept_rob, '3D Printer (FDM)', 'fabrication',
    'FDM 3D printer for rapid prototyping. Requires safety induction. [DEMO] Sample resource.',
    1, 1, 'operational',
    '{"build_volume": "200x200x200mm", "nozzle": "0.4mm", "layer_resolution": "0.1mm"}'::jsonb,
    true, 480, true, ARRAY['3D Printer Safety Induction']
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.resources (organization_id, lab_id, department_id, name, category, description, quantity, available_quantity, operational_status, specifications, is_published, booking_duration_minutes, supervision_required, required_training)
  VALUES (
    org_id, lab_elec, dept_elec, 'DSLR Camera', 'photography',
    'Professional DSLR camera for event photography and videography. Requires photography training. [DEMO] Sample resource.',
    2, 1, 'operational',
    '{"sensor": "APS-C", "megapixels": "24MP", "video": "4K"}'::jsonb,
    true, 360, true, ARRAY['Photography Basics']
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.resources (organization_id, lab_id, department_id, name, category, description, quantity, available_quantity, operational_status, is_published, booking_duration_minutes)
  VALUES (
    org_id, lab_sem, dept_elec, 'Seminar Room', 'space',
    '40-seat seminar room with projector and whiteboard. [DEMO] Sample resource.',
    1, 1, 'operational',
    true, 120
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.resources (organization_id, lab_id, department_id, name, category, description, quantity, available_quantity, operational_status, specifications, is_published, booking_duration_minutes)
  VALUES (
    org_id, lab_comp, dept_elec, 'Computer Workstation', 'computing',
    'Standard computer workstation with development software installed. [DEMO] Sample resource.',
    10, 8, 'operational',
    '{"cpu": "Intel i5", "ram": "16GB", "os": "Ubuntu 22.04"}'::jsonb,
    true, 240
  )
  ON CONFLICT DO NOTHING;

  -- Availability rules (Mon-Fri, 9-5) for each resource
  INSERT INTO public.availability_rules (resource_id, day_of_week, start_time, end_time, is_available)
  SELECT r.id, d.dow, '09:00', '17:00', true
  FROM public.resources r
  CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS d(dow)
  WHERE r.organization_id = org_id
  ON CONFLICT DO NOTHING;
END $$;
