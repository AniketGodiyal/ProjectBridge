/*
# Route student document storage checks through SECURITY DEFINER helpers

Storage policies on the private `student-documents` bucket looked up
`demo_personas` and `student_documents` directly while running as the
browser role. That role has no privilege on those tables, so signed URLs
and uploads would fail with a permission error. This migration moves each
lookup into a helper that runs with its owner's rights and returns only a
boolean.

1. New Functions
- `is_student_document_owner_path(p_name text)`: true when the first folder of the object path is a student persona's ID.
- `is_registered_student_document(p_name text)`: true when a row in `student_documents` records this object path.

2. Modified Policies
- `student_docs_insert_own_folder` on storage.objects now calls the owner-path helper.
- `student_docs_select_registered` on storage.objects now calls the registered-document helper.

3. Security
- Both helpers are SECURITY DEFINER with a fixed search_path.
- EXECUTE is revoked from PUBLIC and granted to `anon` and `authenticated` only, since policy evaluation runs as the caller.
- No table privileges are granted to the browser roles.

Notes
- Policy names are unchanged; the policies are dropped and recreated in place.
- Idempotent: safe to re-run.
*/

CREATE OR REPLACE FUNCTION public.is_student_document_owner_path(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.demo_personas p
    WHERE p.persona_key = 'student'
      AND p.user_id::text = split_part(p_name, '/', 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_registered_student_document(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_documents d
    WHERE d.storage_path = p_name
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_student_document_owner_path(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_registered_student_document(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_student_document_owner_path(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_registered_student_document(text) TO anon, authenticated;

DROP POLICY IF EXISTS "student_docs_insert_own_folder" ON storage.objects;
CREATE POLICY "student_docs_insert_own_folder" ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'student-documents'
  AND public.is_student_document_owner_path(name)
);

DROP POLICY IF EXISTS "student_docs_select_registered" ON storage.objects;
CREATE POLICY "student_docs_select_registered" ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'student-documents'
  AND public.is_registered_student_document(name)
);
