-- Phase 1: Security & Data Foundation
-- Adds subscriptions table, generated_files/generation_cost on client_sites,
-- popia_consent_at/ip on profiles, suspended status on orders, yoco_payment_id on orders.
-- Idempotent: safe to re-run.

-- ── DATA-01: subscriptions table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id        UUID NOT NULL REFERENCES public.orders(id),
  plan            TEXT NOT NULL DEFAULT 'professional',
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'grace_period', 'suspended', 'cancelled')),
  yoco_token_id   TEXT,
  next_charge_at  TIMESTAMPTZ,
  grace_until     TIMESTAMPTZ,
  suspended_at    TIMESTAMPTZ,
  amount_cents    INTEGER NOT NULL DEFAULT 4900,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger — only attach if set_updated_at() exists (migration 001 may not have it)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_subscriptions_updated_at') THEN
      EXECUTE 'CREATE TRIGGER set_subscriptions_updated_at
               BEFORE UPDATE ON public.subscriptions
               FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
    END IF;
  END IF;
END $$;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
CREATE POLICY "Users can read own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can read all subscriptions" ON public.subscriptions
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── DATA-02: generated_files JSONB on client_sites ────────────────
ALTER TABLE public.client_sites
  ADD COLUMN IF NOT EXISTS generated_files JSONB;

-- ── DATA-03: POPIA consent columns on profiles ───────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS popia_consent_at TIMESTAMPTZ;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS popia_consent_ip TEXT;

-- ── DATA-04: Extend orders.status to include 'suspended' ────────
-- Migration 002 already replaced this constraint. Re-drop and re-add with new value.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',
    'payment_pending',
    'paid',
    'building',
    'preview_ready',
    'deployed',
    'live',
    'suspended',
    'cancelled'
  ));

-- ── DATA-05: yoco_payment_id on orders ────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS yoco_payment_id TEXT;

-- ── DATA-06: generation_cost JSONB on client_sites ────────────────
-- Stored as JSONB: {"input_tokens": int, "output_tokens": int, "cost_usd": numeric}
ALTER TABLE public.client_sites
  ADD COLUMN IF NOT EXISTS generation_cost JSONB;

-- ── Performance indexes ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_yoco_payment_id
  ON public.orders(yoco_payment_id) WHERE yoco_payment_id IS NOT NULL;
