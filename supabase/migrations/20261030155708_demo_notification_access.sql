/*
# Demo access to notifications

1. Problem
- Notifications could only be read or marked read by signed-in users, so the demo personas (which run as anon) could never see their notifications. This blocked the new manager alerts for returns.

2. Security changes
- Grants SELECT and UPDATE on notifications to anon and authenticated.
- SELECT and UPDATE policies only apply to rows whose recipient is a demo persona. Real signed-in users keep their existing self-only policies.
- Insert and delete remain unchanged.
*/

GRANT SELECT, UPDATE ON public.notifications TO anon, authenticated;

DROP POLICY IF EXISTS "demo_notifications_select" ON public.notifications;
CREATE POLICY "demo_notifications_select" ON public.notifications
FOR SELECT
TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.demo_personas p WHERE p.user_id = notifications.user_id));

DROP POLICY IF EXISTS "demo_notifications_update" ON public.notifications;
CREATE POLICY "demo_notifications_update" ON public.notifications
FOR UPDATE
TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.demo_personas p WHERE p.user_id = notifications.user_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.demo_personas p WHERE p.user_id = notifications.user_id));
