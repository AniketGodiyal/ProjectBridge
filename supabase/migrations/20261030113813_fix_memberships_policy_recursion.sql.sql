/*
# Fix memberships policy recursion and tighten membership writes

1. Problem
   The INSERT, UPDATE and DELETE policies on `memberships`查询 the `memberships`
   table inside their own checks. Postgres detects this loop and rejects joins with
   "infinite recursion detected in policy for relation memberships".

2. New helper
   - `user_org_ids_with_roles(text[])` returns the organization IDs where the current
     user holds an active membership with one of the given roles. It runs as
     SECURITY DEFINER so policy checks do not re-enter the memberships policies.

3. Membership policy changes
   - INSERT: a user may add their own STUDENT membership, either pending, or active
     only for demo institutions. Admins and managers may add members to their
     institution, and platform admins may add anyone.
   - UPDATE: only institute admins of the institution and platform admins may change
     memberships. Users can no longer edit their own role or status.
   - DELETE: a user may remove their own membership, and institute admins, managers
     and platform admins may remove memberships in their institution.
   - The old self-insert rule allowed a user to insert a membership with any role,
     including institute_admin, in any institution. That is closed here.

4. Institution creation
   - `create_institution(...)` creates an active organization and makes the signed-in
     user its institute_admin in a single database call. Execution is restricted to
     signed-in users.

5. Security notes
   - RLS remains enabled on every table.
   - EXECUTE on the new helper and function is revoked from PUBLIC and anon.
*/

CREATE OR REPLACE FUNCTION public.user_org_ids_with_roles(p_roles text[])
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM public.memberships
  WHERE user_id = auth.uid() AND status = 'active' AND role = ANY(p_roles)
$$;

REVOKE EXECUTE ON FUNCTION public.user_org_ids_with_roles(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_org_ids_with_roles(text[]) TO authenticated;

DROP POLICY IF EXISTS "memberships_insert_admin_self" ON public.memberships;
CREATE POLICY "memberships_insert_self_or_admin" ON public.memberships FOR INSERT
  TO authenticated WITH CHECK (
    (
      user_id = auth.uid()
      AND role = 'student'
      AND (
        status = 'pending'
        OR (
          status = 'active'
          AND EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = memberships.organization_id AND o.name LIKE '[DEMO]%'
          )
        )
      )
    )
    OR organization_id IN (SELECT public.user_org_ids_with_roles(ARRAY['institute_admin','manager']))
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "memberships_update_admin" ON public.memberships;
CREATE POLICY "memberships_update_admin" ON public.memberships FOR UPDATE
  TO authenticated USING (
    organization_id IN (SELECT public.user_org_ids_with_roles(ARRAY['institute_admin']))
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  ) WITH CHECK (
    organization_id IN (SELECT public.user_org_ids_with_roles(ARRAY['institute_admin']))
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "memberships_delete_admin" ON public.memberships;
CREATE POLICY "memberships_delete_admin" ON public.memberships FOR DELETE
  TO authenticated USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT public.user_org_ids_with_roles(ARRAY['institute_admin','manager']))
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.create_institution(
  p_name text,
  p_org_type text,
  p_city text,
  p_state text,
  p_website text,
  p_contact_email text,
  p_contact_phone text,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in required to register an institution';
  END IF;
  IF coalesce(btrim(p_name), '') = '' THEN
    RAISE EXCEPTION 'Institution name is required';
  END IF;

  INSERT INTO public.organizations (
    name, org_type, city, state, website, contact_email, contact_phone, description,
    proposed_admin_email, verification_status, is_active
  ) VALUES (
    btrim(p_name), coalesce(p_org_type, 'university'), nullif(p_city, ''), nullif(p_state, ''),
    nullif(p_website, ''), nullif(p_contact_email, ''), nullif(p_contact_phone, ''),
    nullif(p_description, ''), NULL, 'active', true
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.memberships (user_id, organization_id, role, status)
  VALUES (auth.uid(), new_org_id, 'institute_admin', 'active');

  RETURN new_org_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_institution(text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_institution(text, text, text, text, text, text, text, text) TO authenticated;
