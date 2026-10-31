/*
# Demo booking creation function

## Purpose
Lets the anonymous demo client create a booking request for the active demo
persona. Direct INSERT on `bookings` is blocked by RLS because the app runs
without a sign-in session, so the existing `bookings_insert_self` policy
(`auth.uid() = user_id`) always fails.

## Changes
1. New function `demo_create_booking(p_user_id, p_resource_id, p_start_time, p_end_time, p_purpose)`
   - SECURITY DEFINER, search_path = public.
   - Validates that the resource belongs to the demo organization and is
     operational/published.
   - Inserts a `pending` booking row owned by the demo persona.
   - Inserts a matching `audit_logs` row.
   - Returns the new booking id.
2. Grants EXECUTE to anon + authenticated (the demo client uses anon).

## Security
- The function only touches rows of the demo organization (checked via
  `is_demo_org`). It refuses to create bookings for non-demo resources.
- The caller cannot impersonate arbitrary users: `p_user_id` must exist in
  `demo_personas`, so only the five fixed demo identities can own bookings.
- RLS remains enabled on `bookings` and `audit_logs`; this function bypasses
  it only for demo-org rows.
*/

CREATE OR REPLACE FUNCTION public.demo_create_booking(
  p_user_id uuid,
  p_resource_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_purpose text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_new_id uuid;
  v_status text;
BEGIN
  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'End time must be after start time.';
  END IF;

  SELECT organization_id, operational_status INTO v_org_id, v_status
  FROM public.resources
  WHERE id = p_resource_id AND is_published = true;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Resource not found or not published.';
  END IF;

  IF NOT public.is_demo_org(v_org_id) THEN
    RAISE EXCEPTION 'Bookings can only be created for demo resources.';
  END IF;

  IF v_status NOT IN ('operational') THEN
    RAISE EXCEPTION 'Resource is not available for booking.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.demo_personas WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Only demo personas can create bookings.';
  END IF;

  INSERT INTO public.bookings (
    resource_id, user_id, organization_id, purpose,
    start_time, end_time, status
  ) VALUES (
    p_resource_id, p_user_id, v_org_id, p_purpose,
    p_start_time, p_end_time, 'pending'
  ) RETURNING id INTO v_new_id;

  INSERT INTO public.audit_logs (actor_id, action, organization_id, resource_id, booking_id)
  VALUES (p_user_id, 'booking_requested', v_org_id, p_resource_id, v_new_id);

  RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demo_create_booking(uuid, uuid, timestamptz, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_create_booking(uuid, uuid, timestamptz, timestamptz, text) TO anon, authenticated;
