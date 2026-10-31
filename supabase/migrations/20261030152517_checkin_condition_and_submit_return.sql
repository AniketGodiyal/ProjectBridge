/*
# Check-in condition baseline and QR-verified return submission

1. Changed behaviour
- Manager check-in now records the item's condition at checkout (Good, Minor damage, or Damaged). This is the baseline that returns are compared against. Defaults to Good when not given.
- The old direct "return" action in the booking function is removed. Students now return items through the new return function, which requires a QR scan.

2. New function: demo_submit_return
- Only the student who holds an active check-out can submit a return.
- The scanned QR token must belong to the booked resource.
- Stores the returned condition, notes, photo paths, and submission time on the booking, and moves it to Return Pending (same status the manager already confirms).
- Any return that is not Good is flagged (damage_flagged), opens a damage incident for the manager, and notifies every active resource manager in the organization.
- Records an audit entry.

3. Security
- Both functions are demo-only and granted to anon and authenticated only.
- Photo paths must begin with the booking id.

Notes
- Changing the booking function signature requires dropping the old version first. Existing actions (approve, reject, cancel, complete) keep the same behaviour.
*/

DROP FUNCTION IF EXISTS public.demo_decide_booking(uuid, text, uuid, text);

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

CREATE OR REPLACE FUNCTION public.demo_submit_return(
  p_booking_id uuid,
  p_actor_id uuid,
  p_scan_token text,
  p_condition text,
  p_notes text,
  p_photo_paths text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_owner_id uuid;
  v_status text;
  v_resource_id uuid;
  v_resource_name text;
  v_initial text;
  v_notes text;
  v_flagged boolean;
  v_condition_label text;
  v_initial_label text;
BEGIN
  SELECT b.organization_id, b.user_id, b.status, b.resource_id, b.initial_condition, r.name
  INTO v_org_id, v_owner_id, v_status, v_resource_id, v_initial, v_resource_name
  FROM public.bookings b
  JOIN public.resources r ON r.id = b.resource_id
  WHERE b.id = p_booking_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  IF NOT public.is_demo_org(v_org_id) THEN
    RAISE EXCEPTION 'Only demo bookings can be returned.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.demo_personas WHERE user_id = p_actor_id) THEN
    RAISE EXCEPTION 'Only demo personas can return items.';
  END IF;

  IF p_actor_id IS DISTINCT FROM v_owner_id THEN
    RAISE EXCEPTION 'Only the person who booked this resource can return it.';
  END IF;

  IF v_status NOT IN ('checked_in', 'overdue') THEN
    RAISE EXCEPTION 'This booking is not checked out, so it cannot be returned.';
  END IF;

  IF p_condition IS NULL OR p_condition NOT IN ('good', 'minor_damage', 'damaged') THEN
    RAISE EXCEPTION 'Invalid condition.';
  END IF;

  IF length(COALESCE(p_notes, '')) > 1000 THEN
    RAISE EXCEPTION 'Notes must be 1000 characters or fewer.';
  END IF;

  IF COALESCE(cardinality(p_photo_paths), 0) > 5 THEN
    RAISE EXCEPTION 'Attach up to 5 photos.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_photo_paths, '{}'::text[])) AS photo(path)
    WHERE split_part(photo.path, '/', 1) <> p_booking_id::text
  ) THEN
    RAISE EXCEPTION 'Invalid photo path.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.resource_qr_codes q
    WHERE q.resource_id = v_resource_id AND q.token = p_scan_token
  ) THEN
    RAISE EXCEPTION 'The scanned code does not match this resource.';
  END IF;

  v_flagged := p_condition <> 'good';
  v_notes := NULLIF(btrim(COALESCE(p_notes, '')), '');
  v_condition_label := CASE p_condition WHEN 'minor_damage' THEN 'Minor damage' WHEN 'damaged' THEN 'Damaged' ELSE 'Good' END;
  v_initial_label := CASE COALESCE(v_initial, 'good') WHEN 'minor_damage' THEN 'Minor damage' WHEN 'damaged' THEN 'Damaged' ELSE 'Good' END;

  UPDATE public.bookings
  SET status = 'return_pending',
      return_condition = p_condition,
      return_notes = v_notes,
      return_submitted_at = now(),
      damage_flagged = v_flagged,
      return_photo_paths = COALESCE(p_photo_paths, '{}'::text[]),
      updated_at = now()
  WHERE id = p_booking_id;

  IF v_flagged THEN
    INSERT INTO public.incidents (booking_id, resource_id, organization_id, reported_by, incident_type, description, status)
    VALUES (
      p_booking_id,
      v_resource_id,
      v_org_id,
      p_actor_id,
      'damage',
      'Returned ' || v_resource_name || ' as ' || lower(v_condition_label) || ' (checked out as ' || lower(v_initial_label) || ').'
        || COALESCE(' Student notes: ' || v_notes, ''),
      'reported'
    );
  END IF;

  INSERT INTO public.notifications (user_id, title, body, type, related_id)
  SELECT m.user_id,
    CASE WHEN v_flagged THEN 'Damage reported on return' ELSE 'Return awaiting inspection' END,
    v_resource_name || ' was returned as ' || lower(v_condition_label) || ' (checked out as ' || lower(v_initial_label) || '). Please inspect and confirm.',
    'return_inspection',
    p_booking_id
  FROM public.memberships m
  WHERE m.organization_id = v_org_id
    AND m.role = 'manager'
    AND m.status = 'active';

  INSERT INTO public.notifications (user_id, title, body, type, related_id)
  VALUES (
    v_owner_id,
    'Return Submitted',
    'Your return of ' || v_resource_name || ' was submitted as ' || lower(v_condition_label) || '. Awaiting manager confirmation.',
    'booking',
    p_booking_id
  );

  INSERT INTO public.audit_logs (actor_id, action, organization_id, booking_id, after_value, reason)
  VALUES (
    p_actor_id,
    'return_requested',
    v_org_id,
    p_booking_id,
    jsonb_build_object('condition', p_condition, 'initial_condition', COALESCE(v_initial, 'good'), 'damage_flagged', v_flagged),
    v_notes
  );

  RETURN p_booking_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demo_submit_return(uuid, uuid, text, text, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.demo_submit_return(uuid, uuid, text, text, text, text[]) TO anon, authenticated;
