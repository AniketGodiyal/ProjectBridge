/*
# Student qualification verification: documents, private storage, review functions

## Summary
Students can upload their institution ID, certificates, and training records. Resource
owners (resource managers, lab managers, institute administrators) review those documents
and mark the student Verified or Rejected. Each student has one verification status per
institution: Unsubmitted, Pending, Verified, or Rejected.

## 1. New tables
- `student_verifications`: one row per student per institution.
  - status: 'pending' | 'verified' | 'rejected'
  - submitted_at, reviewed_by, reviewed_at, rejection_reason
- `student_documents`: one row per uploaded document.
  - doc_type: 'institution_id' | 'certificate' | 'training_record'
  - title, storage_path (unique), mime_type, size_bytes, uploaded_at

## 2. Storage
- Private bucket `student-documents`: 10 MB per file, JPEG, PNG, WebP or PDF.
- Files are stored under `<student id>/<document id>/<file name>`.

## 3. Security
- RLS is enabled on both tables. The browser has no direct table access: reads and writes
  go through SECURITY DEFINER functions that check the caller is a demo persona with the
  right role, and that the record belongs to the demo institution.
- Storage: uploads are only allowed into a folder belonging to a demo student persona.
  Reads require a registered document row for that exact path, so signed links only work
  for registered documents.
- Demo-only access: the demo app has no real sign-in. Real production use requires sign-in
  so that the caller identity is verified by the server.

## 4. Functions
- `student_submit_document`: registers an uploaded file and sets verification to Pending.
- `student_review_verification`: verifies or rejects a student. Rejection requires a reason.
  Notifies the student and writes an audit log entry.
- `student_verification_state`: returns the status and document list to the student or a reviewer.
- `is_student_verified`: used by booking approval.
*/

CREATE TABLE IF NOT EXISTS public.student_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS public.student_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('institution_id','certificate','training_record')),
  title text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  size_bytes int NOT NULL CHECK (size_bytes > 0),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_documents_user ON public.student_documents(user_id, organization_id);

ALTER TABLE public.student_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.student_verifications FROM anon, authenticated;
REVOKE ALL ON public.student_documents FROM anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('student-documents', 'student-documents', false, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

DROP POLICY IF EXISTS "student_docs_insert_own_folder" ON storage.objects;
CREATE POLICY "student_docs_insert_own_folder" ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'student-documents'
  AND EXISTS (
    SELECT 1 FROM public.demo_personas p
    WHERE p.persona_key = 'student' AND p.user_id::text = split_part(name, '/', 1)
  )
);

DROP POLICY IF EXISTS "student_docs_select_registered" ON storage.objects;
CREATE POLICY "student_docs_select_registered" ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'student-documents'
  AND EXISTS (SELECT 1 FROM public.student_documents d WHERE d.storage_path = name)
);

CREATE OR REPLACE FUNCTION public.is_student_verified(p_user_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_verifications
    WHERE user_id = p_user_id AND organization_id = p_org_id AND status = 'verified'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_student_verified(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.student_submit_document(
  p_user_id uuid,
  p_doc_type text,
  p_title text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes int
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_doc_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.demo_personas WHERE persona_key = 'student' AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Only demo students can submit documents.';
  END IF;

  SELECT m.organization_id INTO v_org_id
  FROM public.memberships m
  JOIN public.organizations o ON o.id = m.organization_id
  WHERE m.user_id = p_user_id AND o.is_demo AND m.status = 'active'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No institution membership found.';
  END IF;

  IF p_doc_type NOT IN ('institution_id','certificate','training_record') THEN
    RAISE EXCEPTION 'Unknown document type.';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 OR length(p_title) > 120 THEN
    RAISE EXCEPTION 'Document title must be 1 to 120 characters.';
  END IF;

  IF p_mime_type NOT IN ('image/jpeg','image/png','image/webp','application/pdf') THEN
    RAISE EXCEPTION 'Only JPEG, PNG, WebP, or PDF files are allowed.';
  END IF;

  IF p_size_bytes IS NULL OR p_size_bytes < 1 OR p_size_bytes > 10485760 THEN
    RAISE EXCEPTION 'Files must be under 10 MB.';
  END IF;

  IF NOT starts_with(p_storage_path, p_user_id::text || '/') THEN
    RAISE EXCEPTION 'Invalid storage path.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id = 'student-documents' AND o.name = p_storage_path
  ) THEN
    RAISE EXCEPTION 'The uploaded file could not be found.';
  END IF;

  INSERT INTO public.student_documents (user_id, organization_id, doc_type, title, storage_path, mime_type, size_bytes)
  VALUES (p_user_id, v_org_id, p_doc_type, trim(p_title), p_storage_path, p_mime_type, p_size_bytes)
  RETURNING id INTO v_doc_id;

  INSERT INTO public.student_verifications (user_id, organization_id, status, submitted_at)
  VALUES (p_user_id, v_org_id, 'pending', now())
  ON CONFLICT (user_id, organization_id) DO UPDATE
  SET status = 'pending', submitted_at = now(), reviewed_by = NULL, reviewed_at = NULL, rejection_reason = NULL;

  RETURN v_doc_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.student_submit_document(uuid, text, text, text, text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_submit_document(uuid, text, text, text, text, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.student_review_verification(
  p_student_id uuid,
  p_action text,
  p_actor_id uuid,
  p_reason text DEFAULT NULL
) RETURNS text
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

  IF NOT EXISTS (
    SELECT 1 FROM public.demo_personas
    WHERE user_id = p_actor_id AND persona_key IN ('resource_manager','lab_manager','institute_admin')
  ) THEN
    RAISE EXCEPTION 'Only resource owners can review student verification.';
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

REVOKE EXECUTE ON FUNCTION public.student_review_verification(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_review_verification(uuid, text, uuid, text) TO anon, authenticated;

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

  IF NOT EXISTS (
    SELECT 1 FROM public.demo_personas
    WHERE user_id = p_actor_id
      AND (user_id = p_student_id OR persona_key IN ('resource_manager','lab_manager','institute_admin'))
  ) THEN
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

REVOKE EXECUTE ON FUNCTION public.student_verification_state(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_verification_state(uuid, uuid) TO anon, authenticated;
