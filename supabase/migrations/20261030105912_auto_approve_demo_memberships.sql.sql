/*
# Auto-approve demo institution memberships

1. Purpose
   The demo institution ("[DEMO] National Institute of Technology") has no real
   administrator to approve join requests. New users who request membership are
   stuck in "pending" status and can never access the platform. This trigger
   automatically approves any membership request targeting the demo institution,
   so new signups can immediately explore the platform.

2. Changes
   - Creates a function `auto_approve_demo_membership()` that sets
     `status = 'active'` on INSERT when the target organization name starts
     with '[DEMO]'.
   - Creates a trigger `trg_auto_approve_demo` that runs BEFORE INSERT on
     `memberships`.

3. Security
   - The function is SECURITY DEFINER so it can read the org name regardless
     of the caller's RLS scope.
   - It only modifies the `status` column of the row being inserted; it does
     not grant any additional privileges.
   - The auto-approval applies ONLY to organizations whose name starts with
     '[DEMO]' — real institutions still require manual admin approval.
*/

CREATE OR REPLACE FUNCTION public.auto_approve_demo_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_name text;
BEGIN
  SELECT name INTO org_name FROM public.organizations WHERE id = NEW.organization_id;
  IF org_name IS NOT NULL AND org_name LIKE '[DEMO]%' THEN
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_approve_demo ON public.memberships;
CREATE TRIGGER trg_auto_approve_demo
  BEFORE INSERT ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.auto_approve_demo_membership();
