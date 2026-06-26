-- Migration: 0016_drop_orphan_lots
-- Remove pre-fiscal-profile demo lots that were never attached to a profile
-- (e.g. "69002-RÉSIDENCE BELVÉDÈRE" from the original seed). They are invisible
-- in the app (everything is profile-scoped) and only inflate the bien count.
-- Cascade drops their biens and biens_fisc rows.

delete from public.lots where fiscal_profile_id is null;
