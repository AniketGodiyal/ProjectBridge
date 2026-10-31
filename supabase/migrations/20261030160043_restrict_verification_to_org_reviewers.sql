/*
# Restrict student verification review and viewing to organization managers

Before this change, any demo reviewer persona could verify or reject any
student, and any reviewer persona could read any student's documents, even
in an organization they do not manage. This migration checks the caller's
membership in the student's organization instead.

1. New Function
- `is_org_reviewer(p_actor_id, p_org_id)`: true when the actor has an active
  manager or institute admin membership in that organization. Used only by
  other database functions, so it is not callable from the browser.

2. Modified Functions
- `student_review_verification`: verify and reject now require the actor to be
  an active manager or institute admin of the student's organization. The
  reason rules, notifications, and audit entries are unchanged.
- `student_verification_state`: the student can read their own status and
  documents. Anyone else must be an active manager or institute admin of the
  student's organization.

3. Security
- All functions remain SECURITY DEFINER with a fixed search_path.
- EXECUTE on the new helper is revoked from PUBLIC, anon, and authenticated.

Notes
- Idempotent: functions are replaced in place.
*/

CREATE OR REPLACE FUNCTION public.is_org_reviewer(p_actor_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.user_id = p_actor_id
      AND m.organization_id = p_org_id
      AND m.role IN ('manager', 'institute_admin')
      AND m.status = 'active'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_org_reviewer(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.student_review_verification(p_student_id uuid, p_action text, p_actor_id uuid, p_reason text DEFAULT NULL::text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_new_status text;
BEGIN
  SELECT m.organization_id INTO v_org_id
  FROM public.memberships m
  JOIN public.organizations o ON o.id = m.organization_id
  WHERE m.user_id = p_student_id AND o.is_demo AND m.status = 'active'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Student not found.';
  END IF;

  IF NOT public.is_org_reviewer(p_actor_id, v_org_id) THEN
    RAISE EXCEPTION 'Only resource owners and managers can review student verification.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.student_documents WHERE user_id = p_student_id AND organization_id = v_org_id) THEN
    RAISE EXCEPTION 'The student has not uploaded any documents yet.';
  END IF;

  IF p_action = 'verify' THEN
    v_new_status := 'verified';
  ELSIF p_action = 'reject' THEN
    IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
      RAISE EXCEPTION 'A reason is required to reject verification.';
    END IF;
    v_new_status := 'rejected';
  ELSE
    RAISE EXCEPTION 'Unknown action: %', p_action;
  END IF;

  UPDATE public.student_verifications
  SET status = v_new_status,
      reviewed_by = p_actor_id,
      reviewed_at = now(),
      rejection_reason = CASE WHEN v_new_status = 'rejected' THEN trim(p_reason) ELSE NULL END
  WHERE user_id = p_student_id AND organization_id = v_org_id;

  INSERT INTO public.notifications (user_id, title, body, type, related_id)
  VALUES (
    p_student_id,
    CASE WHEN v_new_status = 'verified' THEN 'Verification Approved' ELSE 'Verification Rejected' END,
    CASE WHEN v_new_status = 'verified'
      THEN 'Your documents have been verified. You can now get resource requests approved.'
      ELSE 'Your verification was rejected: ' || trim(p_reason) || '. Please upload updated documents.'
    END,
    'verification',
    NULL
  );

  INSERT INTO public.audit_logs (actor_id, action, organization_id, reason)
  VALUES (
    p_actor_id,
    CASE WHEN v_new_status = 'verified' THEN 'student_verified' ELSE 'student_verification_rejected' END,
    v_org_id,
    CASE WHEN v_new_status = 'rejected' THEN trim(p_reason) ELSE NULL END
  );

  RETURN v_new_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_verification_state(p_student_id uuid, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_row public.student_verifications%ROWTYPE;
  v_docs jsonb;
BEGIN
  SELECT m.organization_id INTO v_org_id
  FROM public.memberships m
  JOIN public.organizations o ON o.id = m.organization_id
  WHERE m.user_id = p_student_id AND o.is_demo AND m.status = 'active'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Student not found.';
  END IF;

  IF p_actor_id IS DISTINCT FROM p_student_id AND NOT public.is_org_reviewer(p_actor_id, v_org_id) THEN
    RAISE EXCEPTION 'Not allowed to view this verification.';
  END IF;

  SELECT * INTO v_row FROM public.student_verifications
  WHERE user_id = p_student_id AND organization_id = v_org_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'doc_type', d.doc_type,
    'title', d.title,
    'storage_path', d.storage_path,
    'mime_type', d.mime_type,
    'size_bytes', d.size_bytes,
    'uploaded_at', d.uploaded_at
  ) ORDER BY d.uploaded_at DESC), '[]'::jsonb)
  INTO v_docs
  FROM public.student_documents d
  WHERE d.user_id = p_student_id AND d.organization_id = v_org_id;

  RETURN jsonb_build_object(
    'status', COALESCE(v_row.status, 'unsubmitted'),
    'submitted_at', v_row.submitted_at,
    'reviewed_at', v_row.reviewed_at,
    'rejection_reason', v_row.rejection_reason,
    'documents', v_docs
  );
END;
$$;
