-- Migration 005: Deploy pipeline schema (Phase 3 DEPLOY)
-- Extends build_status CHECK to include direct Netlify deploy states,
-- adds partial index on build_events for rate-limit queries,
-- and extends the orchestrator queue index to catch deploy_failed retries.
-- Idempotent: safe to re-run.

BEGIN;

-- ── Extend build_status CHECK to include deploying + deployed ──
-- Drops the existing constraint (if any) and re-adds with the full value set.
-- Full set: pending, generating, generated, retry, failed, pushing_github,
--           deploying, deployed, deploy_failed, live, suspended
-- New values added in this migration: deploying, deployed
-- (deploy_failed and suspended were added in migrations 003/004)
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
    'pushing_github', 'deploying', 'deployed', 'deploy_failed',
    'live', 'suspended'
  ));

-- ── Partial index on build_events for rate-limit queries (DEPLOY-03) ──
-- Allows the deploy-site function to efficiently count recent deploy_done
-- events without a full table scan (see 03-RESEARCH.md Pitfall 6).
CREATE INDEX IF NOT EXISTS idx_build_events_deploy_done
  ON public.build_events (event_type, created_at)
  WHERE event_type = 'deploy_done';

-- ── Extend orchestrator queue index to include deploy_failed (DEPLOY-06) ──
-- The existing idx_client_sites_queue only covered pending + retry.
-- Drop and re-create to also catch deploy_failed so the orchestrator
-- can pick up sites that failed to deploy and retry them.
DROP INDEX IF EXISTS idx_client_sites_queue;
CREATE INDEX IF NOT EXISTS idx_client_sites_queue
  ON public.client_sites (build_status, next_retry_at)
  WHERE build_status IN ('pending', 'retry', 'deploy_failed');

COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- MANUAL STEPS REQUIRED AFTER APPLYING THIS MIGRATION:
--
-- 1. Apply migration:
--    supabase db push
--
-- 2. Deploy new Edge Functions:
--    supabase functions deploy deploy-site
--    supabase functions deploy suspend-site
--    supabase functions deploy reactivate-site
--
-- 3. Set new secrets:
--    supabase secrets set NETLIFY_PAT=<your-netlify-personal-access-token>
--    supabase secrets set NETLIFY_TEAM_SLUG=<your-netlify-team-slug>
--
-- 4. Remove GitHub PAT (no longer needed — direct zip-deploy replaces GitHub push):
--    supabase secrets unset GITHUB_PAT
-- ═══════════════════════════════════════════════════════════════
