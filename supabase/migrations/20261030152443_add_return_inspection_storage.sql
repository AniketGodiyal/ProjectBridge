/*
# Return inspection columns and private return-photo storage

1. Modified Tables
- `bookings`
  - `return_submitted_at` (timestamptz): when the student submitted the return.
  - `damage_flagged` (boolean, default false): true when the returned condition is not Good.
  - `return_photo_paths` (text[]): storage paths of the photos attached to the return.

2. Storage
- Private bucket `return-photos`: 5 MB per file, JPEG, PNG or WebP only.
- Files are stored under `<booking id>/<file name>`.

3. Security
- Upload and read policies on the bucket only allow paths that belong to a demo booking.
- Path check runs through a SECURITY DEFINER helper so the policy does not depend on table read access for anon.
- Bucket is not public, so photos are only reachable through signed links created by the app.
*/

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS return_submitted_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS damage_flagged boolean NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS return_photo_paths text[] NOT NULL DEFAULT '{}';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('return-photos', 'return-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

CREATE OR REPLACE FUNCTION public.is_demo_return_photo_path(p_path text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id::text = split_part(p_path, '/', 1)
      AND public.is_demo_org(b.organization_id)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_demo_return_photo_path(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_demo_return_photo_path(text) TO anon, authenticated;

DROP POLICY IF EXISTS "demo_return_photos_insert" ON storage.objects;
CREATE POLICY "demo_return_photos_insert" ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'return-photos' AND public.is_demo_return_photo_path(name));

DROP POLICY IF EXISTS "demo_return_photos_select" ON storage.objects;
CREATE POLICY "demo_return_photos_select" ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'return-photos' AND public.is_demo_return_photo_path(name));
