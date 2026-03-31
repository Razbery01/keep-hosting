-- Keep Hosting Database Schema

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package TEXT NOT NULL CHECK (package IN ('starter', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'payment_pending', 'paid', 'building', 'deployed', 'live', 'cancelled')),
  amount_cents INTEGER NOT NULL,
  domain_name TEXT,
  payment_method TEXT,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client sites table
CREATE TABLE IF NOT EXISTS public.client_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  goals TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  contact_address TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1E3A5F',
  secondary_color TEXT NOT NULL DEFAULT '#00D4FF',
  font_preference TEXT NOT NULL DEFAULT 'Inter',
  about_text TEXT,
  services_text TEXT,
  custom_content JSONB,
  social_links JSONB,
  build_status TEXT NOT NULL DEFAULT 'pending' CHECK (build_status IN ('pending', 'generating', 'generated', 'pushing_github', 'deploying_netlify', 'linking_domain', 'live', 'failed')),
  build_log TEXT,
  github_repo TEXT,
  github_url TEXT,
  netlify_site_id TEXT,
  netlify_url TEXT,
  live_url TEXT,
  domain_status TEXT CHECK (domain_status IN ('pending', 'registered', 'dns_configured', 'active', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- File uploads table
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.client_sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (file_type IN ('logo', 'favicon', 'hero_image', 'gallery', 'brand_asset')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Build events table (audit log)
CREATE TABLE IF NOT EXISTS public.build_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.client_sites(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('info', 'success', 'warning', 'error')),
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_client_sites_updated_at BEFORE UPDATE ON public.client_sites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can read own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all orders" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can read own sites" ON public.client_sites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create sites" ON public.client_sites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sites" ON public.client_sites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all sites" ON public.client_sites FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update all sites" ON public.client_sites FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can read own uploads" ON public.file_uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create uploads" ON public.file_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all uploads" ON public.file_uploads FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can read own build events" ON public.build_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.client_sites WHERE id = build_events.site_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can read all build events" ON public.build_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can create build events" ON public.build_events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('client-assets', 'client-assets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own assets" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can read own assets" ON storage.objects FOR SELECT
  USING (bucket_id = 'client-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can read all assets" ON storage.objects FOR SELECT
  USING (bucket_id = 'client-assets' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
