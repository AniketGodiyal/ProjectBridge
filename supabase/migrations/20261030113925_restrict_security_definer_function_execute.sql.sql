/*
# Restrict execute rights on SECURITY DEFINER helper functions

1. Problem
   Several SECURITY DEFINER functions were callable by any role through the Data API.
   Trigger functions and the touch timestamp helper do not need to be callable at all.

2. Changes
   - `auto_approve_demo_membership()` and `touch_updated_at()` (trigger functions):
     execute rights removed from PUBLIC, anon and authenticated. Triggers still fire.
   - `user_org_ids()`: execute removed from PUBLIC and anon, kept for authenticated
     because row level security policies call it while signed in.

3. Security notes
   - No table policies or data access change.
*/

REVOKE EXECUTE ON FUNCTION public.auto_approve_demo_membership() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_org_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_org_ids() TO authenticated;
