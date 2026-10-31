/*
# Add per-resource QR codes

1. New Tables
- `resource_qr_codes`: one unique, unguessable token per resource. Stored separately from `resources` so the token is never returned by normal resource reads (a student could otherwise copy it without standing in front of the item).

2. Automation
- Every new resource automatically gets a QR token via a trigger.
- Existing resources are backfilled with a token.

3. Functions
- `demo_get_resource_qr(resource, actor)`: returns the token for resource managers only (used to draw the printable QR code).
- `demo_check_booking_qr(booking, token)`: returns true when a scanned token belongs to the resource on that booking.

4. Security
- RLS enabled on `resource_qr_codes` with no policies and no grants to anon or authenticated, so the table is only reachable through the functions above.
- Both functions are limited to demo organizations and demo personas.

Notes
- Tokens are random UUID strings. They are never written to logs.
*/

CREATE TABLE IF NOT EXISTS public.resource_qr_codes (
  resource_id uuid PRIMARY KEY REFERENCES public.resources(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resource_qr_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.resource_qr_codes FROM PUBLIC, anon, authenticated;

INSERT INTO public.resource_qr_codes (resource_id)
SELECT id FROM public.resources
ON CONFLICT (resource_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_resource_qr_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.resource_qr_codes (resource_id)
  VALUES (NEW.id)
  ON CONFLICT (resource_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_resource_qr_code() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS resources_create_qr_code ON public.resources;
CREATE TRIGGER resources_create_qr_code
AFTER INSERT ON public.resources
FOR EACH ROW EXECUTE FUNCTION public.create_resource_qr_code();

CREATE OR REPLACE FUNCTION public.demo_get_resource_qr(p_resource_id uuid, p_actor_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_token text;
BEGIN
  SELECT organization_id INTO v_org_id FROM public.resources WHERE id = p_resource_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Resource not found.';
  END IF;

  IF NOT public.is_demo_org(v_org_id) THEN
    RAISE EXCEPTION 'Only demo resources are available.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = p_actor_id
      AND m.organization_id = v_org_id
      AND m.role IN ('manager', 'institute_admin')
      AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only resource managers can view QR codes.';
  END IF;

  SELECT token INTO v_token FROM public.resource_qr_codes WHERE resource_id = p_resource_id;
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.demo_check_booking_qr(p_booking_id uuid, p_token text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.resource_qr_codes q ON q.resource_id = b.resource_id
    WHERE b.id = p_booking_id
      AND q.token = p_token
      AND public.is_demo_org(b.organization_id)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.demo_get_resource_qr(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.demo_get_resource_qr(uuid, uuid) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.demo_check_booking_qr(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.demo_check_booking_qr(uuid, text) TO anon, authenticated;
