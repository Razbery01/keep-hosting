-- Fix recursive RLS policies and add preview_ready status
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- 1. Create a SECURITY DEFINER helper that checks admin without triggering RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Drop the recursive admin policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can read all sites" ON public.client_sites;
DROP POLICY IF EXISTS "Admins can update all sites" ON public.client_sites;
DROP POLICY IF EXISTS "Admins can read all uploads" ON public.file_uploads;
DROP POLICY IF EXISTS "Admins can read all build events" ON public.build_events;
DROP POLICY IF EXISTS "Admins can create build events" ON public.build_events;

-- 3. Re-create admin policies using the non-recursive is_admin() function
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can read all orders" ON public.orders
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can read all sites" ON public.client_sites
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update all sites" ON public.client_sites
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can read all uploads" ON public.file_uploads
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can read all build events" ON public.build_events
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can create build events" ON public.build_events
  FOR INSERT WITH CHECK (public.is_admin());

-- 4. Add preview_ready to orders status constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'payment_pending', 'paid', 'building', 'preview_ready', 'deployed', 'live', 'cancelled'));

-- 5. Allow users to update their own orders (needed for Approve & Pay)
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can update own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. Make client-assets bucket public so built sites can reference uploaded logos/hero images
UPDATE storage.buckets SET public = true WHERE id = 'client-assets';
