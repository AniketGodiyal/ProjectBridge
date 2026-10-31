/*
# Demo booking decision function

## Purpose
Lets the anonymous demo client approve, reject, check in, or complete a
booking. Direct UPDATE on `bookings` is blocked by RLS because the app runs
without a sign-in session.

## Changes
1. New function `demo_decide_booking(p_booking_id, p_action, p_actor_id, p_reason)`
   - SECURITY DEFINER, search_path = public.
   - Validates the booking belongs to the demo organization.
   - Transitions the booking status and sets the appropriate fields.
   - Inserts a notification to the booking owner and an audit log entry.
   - Returns the updated booking id.
2. Grants EXECUTE to anon + authenticated.

## Security
- Only touches bookings of the demo organization (checked via is_demo_org).
- p_actor_id must exist in demo_personas.
- Allowed actions: approve, reject, checkin, complete. Any other action raises.
*/

CREATE OR REPLACE FUNCTION public.demo_decide_booking(
  p_booking_id uuid,
  p_action text,
  p_actor_id uuid,
  p_reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_old_status text;
  v_new_status text;
  v_resource_name text;
BEGIN
  SELECT b.organization_id, b.user_id, b.status, r.name
  INTO v_org_id, v_user_id, v_old_status, v_resource_name
  FROM public.bookings b
  JOIN public.resources r ON r.id = b.resource_id
  WHERE b.id = p_booking_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  IF NOT public.is_demo_org(v_org_id) THEN
    RAISE EXCEPTION 'Only demo bookings can be modified.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.demo_personas WHERE user_id = p_actor_id) THEN
    RAISE EXCEPTION 'Only demo personas can perform booking actions.';
  END IF;

  v_new_status := CASE p_action
    WHEN 'approve' THEN 'approved'
    WHEN 'reject' THEN 'rejected'
    WHEN 'checkin' THEN 'checked_in'
    WHEN 'complete' THEN 'completed'
    ELSE NULL
  END;

  IF v_new_status IS NULL THEN
    RAISE EXCEPTION 'Unknown action: %', p_action;
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.bookings
    SET status = 'approved', approval_user_id = p_actor_id, approved_at = now(), rejection_reason = NULL
    WHERE id = p_booking_id;
  ELSEIF p_action = 'reject' THEN
    UPDATE public.bookings
    SET status = 'rejected', rejection_reason = p_reason, approval_user_id = p_actor_id
    WHERE id = p_booking_id;
  ELSEIF p_action = 'checkin' THEN
    UPDATE public.bookings
    SET status = 'checked_in', checkin_at = now()
    WHERE id = p_booking_id;
    INSERT INTO public.checkin_events (booking_id, event_type, performed_by)
    VALUES (p_booking_id, 'checkin', p_actor_id);
  ELSEIF p_action = 'complete' THEN
    UPDATE public.bookings
    SET status = 'completed', checkout_at = now()
    WHERE id = p_booking_id;
    INSERT INTO public.checkin_events (booking_id, event_type, performed_by)
    VALUES (p_booking_id, 'checkout', p_actor_id);
  END IF;

  INSERT INTO public.notifications (user_id, title, body, type, related_id)
  VALUES (
    v_user_id,
    CASE p_action WHEN 'approve' THEN 'Booking Approved' WHEN 'reject' THEN 'Booking Rejected' WHEN 'checkin' THEN 'Checked In' WHEN 'complete' THEN 'Booking Completed' END,
    CASE p_action
      WHEN 'approve' THEN 'Your booking for ' || COALESCE(v_resource_name, 'a resource') || ' has been approved.'
      WHEN 'reject' THEN 'Your booking for ' || COALESCE(v_resource_name, 'a resource') || ' was rejected' || COALESCE(': ' || p_reason, '.')
      WHEN 'checkin' THEN 'Your booking for ' || COALESCE(v_resource_name, 'a resource') || ' has been checked in.'
      WHEN 'complete' THEN 'Your booking for ' || COALESCE(v_resource_name, 'a resource') || ' has been completed.'
    END,
    'booking',
    p_booking_id
  );

  INSERT INTO public.audit_logs (actor_id, action, organization_id, booking_id, reason)
  VALUES (p_actor_id,
    CASE p_action WHEN 'approve' THEN 'booking_approved' WHEN 'reject' THEN 'booking_rejected' WHEN 'checkin' THEN 'checkin' WHEN 'complete' THEN 'return_confirmed' END,
    v_org_id, p_booking_id, p_reason);

  RETURN p_booking_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demo_decide_booking(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_decide_booking(uuid, text, uuid, text) TO anon, authenticated;
