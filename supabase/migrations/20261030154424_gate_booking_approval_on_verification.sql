/*
# Require verified students before booking approval

## Summary
A resource request can only be approved once the requesting student's documents have been
reviewed and marked Verified for this institution. Other actions (reject, check-in,
complete, cancel) are unchanged.

## 1. Changed function
- `demo_decide_booking` is replaced with the same signature. The only behaviour change is
  that the approve action now raises "Student must be verified before approval." when the
  student is not verified.

## 2. Security
- Still demo-only, granted to anon and authenticated only, same guards as before.
*/

CREATE OR REPLACE FUNCTION public.demo_decide_booking(
  p_booking_id uuid,
  p_action text,
  p_actor_id uuid,
  p_reason text DEFAULT NULL,
  p_condition text DEFAULT NULL
)
RETURNS uuid
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
  v_checkin_condition text;
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
    WHEN 'cancel' THEN 'cancelled'
    ELSE NULL
  END;

  IF v_new_status IS NULL THEN
    RAISE EXCEPTION 'Unknown action: %', p_action;
  END IF;

  IF p_action = 'approve' AND NOT public.is_student_verified(v_user_id, v_org_id) THEN
    RAISE EXCEPTION 'Student must be verified before approval.';
  END IF;

  IF p_action = 'checkin' THEN
    v_checkin_condition := COALESCE(p_condition, 'good');
    IF v_checkin_condition NOT IN ('good', 'minor_damage', 'damaged') THEN
      RAISE EXCEPTION 'Invalid condition.';
    END IF;
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.bookings
    SET status = 'approved', approval_user_id = p_actor_id, approved_at = now(), rejection_reason = NULL
    WHERE id = p_booking_id;
  ELSIF p_action = 'reject' THEN
    UPDATE public.bookings
    SET status = 'rejected', rejection_reason = p_reason, approval_user_id = p_actor_id
    WHERE id = p_booking_id;
  ELSIF p_action = 'checkin' THEN
    UPDATE public.bookings
    SET status = 'checked_in', checkin_at = now(), initial_condition = v_checkin_condition
    WHERE id = p_booking_id;
    INSERT INTO public.checkin_events (booking_id, event_type, performed_by, condition_notes)
    VALUES (p_booking_id, 'checkin', p_actor_id, v_checkin_condition);
  ELSIF p_action = 'complete' THEN
    UPDATE public.bookings
    SET status = 'completed', checkout_at = now()
    WHERE id = p_booking_id;
    INSERT INTO public.checkin_events (booking_id, event_type, performed_by)
    VALUES (p_booking_id, 'checkout', p_actor_id);
  ELSIF p_action = 'cancel' THEN
    UPDATE public.bookings
    SET status = 'cancelled'
    WHERE id = p_booking_id;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, type, related_id)
  VALUES (
    v_user_id,
    CASE p_action
      WHEN 'approve' THEN 'Booking Approved'
      WHEN 'reject' THEN 'Booking Rejected'
      WHEN 'checkin' THEN 'Checked In'
      WHEN 'complete' THEN 'Booking Completed'
      WHEN 'cancel' THEN 'Booking Cancelled'
    END,
    CASE p_action
      WHEN 'approve' THEN 'Your booking for ' || COALESCE(v_resource_name, 'a resource') || ' has been approved.'
      WHEN 'reject' THEN 'Your booking for ' || COALESCE(v_resource_name, 'a resource') || ' was rejected' || COALESCE(': ' || p_reason, '.')
      WHEN 'checkin' THEN 'Your booking for ' || COALESCE(v_resource_name, 'a resource') || ' has been checked in.'
      WHEN 'complete' THEN 'Your booking for ' || COALESCE(v_resource_name, 'a resource') || ' has been completed.'
      WHEN 'cancel' THEN 'Your booking for ' || COALESCE(v_resource_name, 'a resource') || ' has been cancelled.'
    END,
    'booking',
    p_booking_id
  );

  INSERT INTO public.audit_logs (actor_id, action, organization_id, booking_id, reason)
  VALUES (
    p_actor_id,
    CASE p_action
      WHEN 'approve' THEN 'booking_approved'
      WHEN 'reject' THEN 'booking_rejected'
      WHEN 'checkin' THEN 'checkin'
      WHEN 'complete' THEN 'return_confirmed'
      WHEN 'cancel' THEN 'booking_cancelled'
    END,
    v_org_id,
    p_booking_id,
    p_reason
  );

  RETURN p_booking_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demo_decide_booking(uuid, text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.demo_decide_booking(uuid, text, uuid, text, text) TO anon, authenticated;
