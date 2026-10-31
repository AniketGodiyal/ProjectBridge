/*
# Add demo resources for common student projects (drones, line follower, robots)

## Purpose
The existing demo inventory has Arduino boards and IR sensors but is missing
motor drivers, DC motors, chassis, batteries, jumper wires, breadboards,
drone frames, flight controllers, ESCs, propellers, cameras, GPS modules,
servo motors, ultrasonic sensors, and other common components. This causes
the AI Project Resource Engine to report "No Match Found" for most
requirements when students describe common projects like drones, line
follower robots, or general robotics builds.

## Changes
1. Inserts ~25 new published, operational resources into the demo org,
   distributed across the Embedded Systems Lab, Robotics Lab, Electronics
   Circuit Lab, and Computer Lab.
2. All new resources are `operational`, `is_published = true`, with weekday
   availability rules (09:00-17:00).
3. Idempotent: uses NOT EXISTS checks on resource name within the demo org
   so re-running is safe.

## Security
- Only touches the demo organization's resources.
- No policy or grant changes.
*/

DO $$
DECLARE
  v_org_id uuid := '0a462985-a258-4349-aedf-47e9131f2eec';
  l_embed uuid := '6f1a6c3f-e356-4713-a080-c5fdf40ec909';
  l_robot uuid := '7108c573-4071-4fd2-a906-a5869281c422';
  l_circuit uuid := '9d509fb2-78bc-4ec7-9be4-5e9e33114f2d';
  l_comp uuid := 'b0d82069-fdc1-4f9c-bf66-1b1d773dc6c3';
  d_ece uuid := 'acbbb64f-e8a0-426a-9c33-6f4f2ce8ad20';
  d_cse uuid := '499efed3-7786-4d4d-99cb-8af93e099d8c';
BEGIN
  INSERT INTO public.resources (organization_id, lab_id, department_id, name, category, description, quantity, available_quantity, operational_status, specifications, access_rules, required_training, supervision_required, booking_duration_minutes, is_published, owner_user_id)
  SELECT v_org_id, v.lab, v.dept, v.name, v.cat, v.descr, v.qty, v.qty, v.status, v.specs::jsonb, v.access::jsonb,
    CASE WHEN v.training THEN ARRAY['Lab safety induction'] ELSE '{}'::text[] END, v.supervised, v.dur, true, NULL::uuid
  FROM (VALUES
    -- Line follower robot & general electronics
    (l_embed, d_ece, 'DC geared motors (fictional)', 'equipment', '6V DC geared motors for robotics drives.', 12, 'operational', '{"voltage":"6V","rpm":"200","gear_ratio":"1:48"}', '{"eligible":"All students"}', false, false, 180),
    (l_embed, d_ece, 'Motor driver modules L298N (fictional)', 'equipment', 'Dual H-bridge motor drivers for controlling DC motors from a microcontroller.', 8, 'operational', '{"type":"L298N","channels":2,"max_current":"2A"}', '{"eligible":"All students"}', false, false, 180),
    (l_embed, d_ece, 'Motor driver modules L293D (fictional)', 'equipment', 'Quadruple H-bridge motor drivers for low-current motors.', 6, 'operational', '{"type":"L293D","channels":2,"max_current":"0.6A"}', '{"eligible":"All students"}', false, false, 180),
    (l_embed, d_ece, 'Robot chassis kits (fictional)', 'equipment', 'Acrylic robot chassis with 2-wheel drive and caster wheel.', 6, 'operational', '{"material":"acrylic","drive":"2WD"}', '{"eligible":"All students"}', false, false, 240),
    (l_embed, d_ece, 'Robot wheels (fictional)', 'equipment', '65mm rubber wheels for robot chassis.', 10, 'operational', '{"diameter":"65mm"}', '{"eligible":"All students"}', false, false, 240),
    (l_embed, d_ece, 'Battery packs 9V (fictional)', 'equipment', 'Rechargeable 9V battery packs for robotics projects.', 8, 'operational', '{"voltage":"9V","type":"NiMH rechargeable"}', '{"eligible":"All students"}', false, false, 240),
    (l_embed, d_ece, 'Li-ion battery packs (fictional)', 'equipment', '7.4V Li-ion battery packs with BMS for drones and robots.', 6, 'operational', '{"voltage":"7.4V","cells":2,"type":"Li-ion"}', '{"eligible":"Students with battery safety induction"}', true, false, 240),
    (l_embed, d_ece, 'Jumper wires (fictional)', 'equipment', 'Male-to-male and male-to-female jumper wire sets.', 20, 'operational', '{"types":"M-M, M-F, F-F"}', '{"eligible":"All students"}', false, false, 240),
    (l_embed, d_ece, 'Breadboards (fictional)', 'equipment', 'Half-size and full-size solderless breadboards for prototyping.', 15, 'operational', '{"size":"half and full"}', '{"eligible":"All students"}', false, false, 240),
    (l_embed, d_ece, 'ESP32 development boards (fictional)', 'equipment', 'Wi-Fi/Bluetooth-enabled microcontroller boards.', 8, 'operational', '{"chip":"ESP32","wifi":true,"bluetooth":true,"voltage":"3.3V"}', '{"eligible":"All students"}', false, false, 180),
    (l_embed, d_ece, 'Raspberry Pi Pico (fictional)', 'equipment', 'RP2040-based microcontroller boards.', 6, 'operational', '{"chip":"RP2040","voltage":"3.3V"}', '{"eligible":"All students"}', false, false, 180),
    (l_embed, d_ece, 'Ultrasonic sensors HC-SR04 (fictional)', 'equipment', 'Ultrasonic distance sensors for obstacle detection.', 10, 'operational', '{"range":"2-400 cm","voltage":"5V"}', '{"eligible":"All students"}', false, false, 180),
    (l_embed, d_ece, 'Servo motors SG90 (fictional)', 'equipment', '9g micro servo motors for robotic arms and steering.', 12, 'operational', '{"type":"SG90","torque":"1.8 kg-cm","rotation":"180"}', '{"eligible":"All students"}', false, false, 180),
    (l_embed, d_ece, 'Servo motors MG996R (fictional)', 'equipment', 'High-torque standard servo motors for heavier mechanisms.', 6, 'operational', '{"type":"MG996R","torque":"11 kg-cm","rotation":"180"}', '{"eligible":"All students"}', false, false, 180),

    -- Drone components
    (l_robot, d_ece, 'Drone frames (fictional)', 'equipment', 'F450 quadcopter frames with arms and landing gear.', 4, 'operational', '{"type":"F450","wheelbase":"450mm","material":"glass fiber"}', '{"eligible":"Students with drone safety induction"}', true, true, 240),
    (l_robot, d_ece, 'Flight controllers (fictional)', 'equipment', 'Multi-rotor flight controller boards (multiwii/ESP-based).', 5, 'operational', '{"type":"ESP32 flight controller","gyro":true,"accel":true,"baro":true}', '{"eligible":"Students with drone safety induction"}', true, true, 240),
    (l_robot, d_ece, 'Electronic speed controllers ESC (fictional)', 'equipment', '30A brushless ESCs for quadcopter motors.', 8, 'operational', '{"rating":"30A","voltage":"2-4S LiPo"}', '{"eligible":"Students with drone safety induction"}', true, true, 240),
    (l_robot, d_ece, 'Brushless motors (fictional)', 'equipment', '1000KV brushless outrunner motors for drones.', 8, 'operational', '{"kv":"1000","voltage":"7.4-11.1V"}', '{"eligible":"Students with drone safety induction"}', true, true, 240),
    (l_robot, d_ece, 'Propellers (fictional)', 'equipment', '1045 propeller pairs (CW and CCW) for quadcopters.', 10, 'operational', '{"size":"10x4.5","pairs":true}', '{"eligible":"Students with drone safety induction"}', true, false, 240),
    (l_robot, d_ece, 'LiPo batteries (fictional)', 'equipment', '3S 11.1V LiPo batteries for drones.', 6, 'operational', '{"voltage":"11.1V","cells":3,"capacity":"2200mAh"}', '{"eligible":"Students with battery safety induction"}', true, true, 240),
    (l_robot, d_ece, 'LiPo battery chargers (fictional)', 'equipment', 'Balance chargers for LiPo batteries.', 3, 'operational', '{"type":"balance charger","cells":"2-4S"}', '{"eligible":"Students with battery safety induction"}', true, false, 240),
    (l_robot, d_ece, 'GPS modules (fictional)', 'equipment', 'NEO-6M GPS modules for drone navigation.', 4, 'operational', '{"chip":"NEO-6M","update_rate":"1Hz"}', '{"eligible":"Students with drone safety induction"}', false, false, 180),
    (l_robot, d_ece, 'FPV cameras (fictional)', 'equipment', 'Mini FPV cameras for drone video feed.', 4, 'operational', '{"resolution":"600TVL","voltage":"5V"}', '{"eligible":"Students with drone safety induction"}', false, false, 180),

    -- General robotics & tools
    (l_robot, d_ece, 'Stepper motors NEMA17 (fictional)', 'equipment', 'NEMA17 stepper motors for CNC and precision robotics.', 6, 'operational', '{"type":"NEMA17","step_angle":"1.8","voltage":"12V"}', '{"eligible":"All students"}', false, false, 240),
    (l_robot, d_ece, 'Robot arm kits (fictional)', 'equipment', '5-DOF robotic arm kits with servo motors.', 3, 'operational', '{"dof":5,"type":"servo-driven"}', '{"eligible":"Students with robotics induction"}', true, true, 240),
    (l_robot, d_ece, 'Bluetooth modules HC-05 (fictional)', 'equipment', 'Bluetooth serial modules for wireless control.', 8, 'operational', '{"type":"HC-05","range":"10m"}', '{"eligible":"All students"}', false, false, 180),
    (l_circuit, d_ece, 'Power supply units (fictional)', 'equipment', 'Adjustable bench power supplies 0-30V.', 4, 'operational', '{"voltage":"0-30V","current":"0-3A"}', '{"eligible":"Students who completed lab induction"}', true, true, 240),
    (l_circuit, d_ece, 'Logic analyzers (fictional)', 'equipment', '8-channel USB logic analyzers for debugging.', 3, 'operational', '{"channels":8,"max_rate":"24MHz"}', '{"eligible":"Students who completed lab induction"}', false, false, 240),
    (l_circuit, d_ece, 'Resistor kits (fictional)', 'equipment', 'Assorted resistor kits for prototyping.', 5, 'operational', '{"range":"1 ohm - 10M ohm"}', '{"eligible":"All students"}', false, false, 240),
    (l_circuit, d_ece, 'Capacitor kits (fictional)', 'equipment', 'Assorted capacitor kits for prototyping.', 5, 'operational', '{"types":"ceramic, electrolytic"}', '{"eligible":"All students"}', false, false, 240),
    (l_comp, d_cse, 'Raspberry Pi 4 (fictional)', 'equipment', 'Raspberry Pi 4 single-board computers for projects.', 5, 'operational', '{"ram":"4GB","usb":"USB 3.0","wifi":true}', '{"eligible":"All students"}', false, false, 240),

    -- Workspaces
    (NULL::uuid, d_ece, 'Robotics workbench (fictional)', 'space', 'Dedicated robotics workbench with tools and power.', 1, 'operational', '{"capacity":4}', '{"eligible":"Students with robotics induction"}', false, false, 240),
    (NULL::uuid, d_ece, 'Drone testing area (fictional)', 'space', 'Indoor netted area for drone testing.', 1, 'operational', '{"capacity":6,"type":"netted"}', '{"eligible":"Students with drone safety induction"}', true, true, 120)
  ) AS v(lab, dept, name, cat, descr, qty, status, specs, access, training, supervised, dur)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.organization_id = v_org_id AND r.name = v.name
  );

  -- Add weekday availability rules for new resources
  INSERT INTO public.availability_rules (resource_id, day_of_week, start_time, end_time, is_available)
  SELECT r.id, dow, '09:00', '17:00', true
  FROM public.resources r, generate_series(1, 5) AS dow
  WHERE r.organization_id = v_org_id
    AND NOT EXISTS (SELECT 1 FROM public.availability_rules a WHERE a.resource_id = r.id);
END;
$$;
