-- Migration 007: PayFast schema (Phase 4 PAY)
-- Pre-launch: safe to rename columns — no production data at risk.
-- Renames Yoco columns to PayFast equivalents and adds subscription lifecycle columns.

-- ── orders table ─────────────────────────────────────────────────────────────

-- Rename yoco_payment_id to generic payment_id (provider-agnostic)
ALTER TABLE public.orders
  RENAME COLUMN yoco_payment_id TO payment_id;

-- Update index: drop old, create new
DROP INDEX IF EXISTS idx_orders_yoco_payment_id;
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON public.orders (payment_id);

-- ── subscriptions table ───────────────────────────────────────────────────────

-- Rename yoco_token_id to payfast_subscription_id
ALTER TABLE public.subscriptions
  RENAME COLUMN yoco_token_id TO payfast_subscription_id;

-- Add PayFast-specific subscription columns
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payfast_token TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_charge_count INT NOT NULL DEFAULT 0;

-- Update status check constraint to include 'cancelling'
-- Drop old constraint (created in migration 003)
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- Add new constraint with 'cancelling' status
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
    CHECK (status IN ('active', 'grace_period', 'suspended', 'cancelled', 'cancelling'));
