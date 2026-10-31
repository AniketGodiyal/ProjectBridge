/*
# Demo mode: allow incident updates in the demo organization

## Problem
The incidents UPDATE policy (`incidents_update_org`) is scoped to
`authenticated` and uses `user_org_ids()` which calls `auth.uid()`. In demo
mode the client runs as the `anon` role with no real session, so
`auth.uid()` returns NULL, `user_org_ids()` returns an empty set, and
every UPDATE silently matches zero rows. Resolving an incident in the
manager UI appears to do nothing.

## Fix
1. Grant UPDATE on `incidents` to `anon` (in addition to `authenticated`).
2. Add a `demo_incidents_update` policy allowing `anon` + `authenticated`
   to UPDATE incidents whose `organization_id` is the demo org, scoped via
   `is_demo_org()`.

## Security
- Only the demo organization is affected (`is_demo_org` check).
- Non-demo data remains protected by the existing `authenticated`-only
  `incidents_update_org` policy.
- RLS stays enabled.
*/

GRANT UPDATE ON public.incidents TO anon;

DROP POLICY IF EXISTS "demo_incidents_update" ON public.incidents;
CREATE POLICY "demo_incidents_update" ON public.incidents FOR UPDATE
  TO anon, authenticated
  USING (public.is_demo_org(organization_id))
  WITH CHECK (public.is_demo_org(organization_id));
