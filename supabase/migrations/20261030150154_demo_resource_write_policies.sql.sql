/*
# Demo mode: allow anon to create/update resources and audit logs in the demo org

## Purpose
The resource editor (Faculty/Lab Manager) does direct INSERT/UPDATE on
`resources` and INSERT on `audit_logs`. In demo mode the client runs as
the `anon` role, which has no INSERT or UPDATE policies on these tables
(only `authenticated` does). Every save silently fails with a permission
error.

## Changes
1. `demo_resources_insert` — allows anon + authenticated to INSERT resources
   whose organization_id is the demo org.
2. `demo_resources_update` — allows anon + authenticated to UPDATE resources
   in the demo org.
3. `demo_audit_insert` — allows anon + authenticated to INSERT audit log
   entries for the demo org.

## Security
- All three policies are scoped to the demo organization via is_demo_org().
- Non-demo data is unaffected — no policy applies.
- RLS remains enabled; these are additive demo-only policies.
*/

DROP POLICY IF EXISTS "demo_resources_insert" ON public.resources;
CREATE POLICY "demo_resources_insert" ON public.resources FOR INSERT
  TO anon, authenticated WITH CHECK (public.is_demo_org(organization_id));

DROP POLICY IF EXISTS "demo_resources_update" ON public.resources;
CREATE POLICY "demo_resources_update" ON public.resources FOR UPDATE
  TO anon, authenticated
  USING (public.is_demo_org(organization_id))
  WITH CHECK (public.is_demo_org(organization_id));

DROP POLICY IF EXISTS "demo_audit_insert" ON public.audit_logs;
CREATE POLICY "demo_audit_insert" ON public.audit_logs FOR INSERT
  TO anon, authenticated WITH CHECK (public.is_demo_org(organization_id));
