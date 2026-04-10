-- Migration 004: Generation queue state columns (Phase 2 GEN-05 + GEN-08)
-- Adds retry tracking columns to client_sites and extends build_status CHECK
-- to allow the 'retry' status used by build-orchestrator.
-- Idempotent: safe to re-run.

BEGIN;

-- ── GEN-05: queue state columns ──
ALTER TABLE public.client_sites
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- ── Extend build_status CHECK (if it exists) to allow 'retry' ──
-- The existing check constraint from migration 001/002 must be dropped and re-added.
-- If no check constraint exists, this is a no-op.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name LIKE 'client_sites_build_status%'
  ) THEN
    ALTER TABLE public.client_sites DROP CONSTRAINT IF EXISTS client_sites_build_status_check;
  END IF;
END $$;

ALTER TABLE public.client_sites
  ADD CONSTRAINT client_sites_build_status_check
  CHECK (build_status IN (
    'pending', 'generating', 'generated', 'retry', 'failed',
    'pushing_github', 'live', 'deploy_failed', 'suspended'
  ));

-- ── Index to make the orchestrator query fast ──
CREATE INDEX IF NOT EXISTS idx_client_sites_queue
  ON public.client_sites (build_status, next_retry_at)
  WHERE build_status IN ('pending', 'retry');

-- ── Storage bucket for generated sites (persist-files writes here) ──
-- NOTE: Bucket creation via SQL is LOW CONFIDENCE for Supabase managed projects.
-- Migration 003 deliberately moved bucket config to the Dashboard. Same policy here:
-- The executor must manually create the `client-sites` bucket in the Supabase Dashboard
-- during the human-verify checkpoint (Task 7). This migration documents the requirement only.

COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- MANUAL STEPS REQUIRED AFTER APPLYING THIS MIGRATION:
--
-- 1. Supabase Dashboard → Database → Extensions → enable `pg_cron` and `pg_net`
-- 2. Supabase Dashboard → Storage → Create bucket `client-sites` (private)
-- 3. Supabase Dashboard → Edge Functions → Deploy generate-site, persist-files, build-orchestrator
-- 4. Supabase Dashboard → SQL Editor → run the cron schedule below (replace <PROJECT_REF>):
--
-- SELECT cron.schedule(
--   'generation-queue-poll',
--   '*/2 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/build-orchestrator',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   )
--   $$
-- );
-- ═══════════════════════════════════════════════════════════════
