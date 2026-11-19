-- ============================================================================
-- Snapshot before the membership cutover.
-- ============================================================================
-- Run immediately before migrating members off Authorize.net ARB (see the
-- cutover runbook). Copies the tables the migration touches into _bak_024_*
-- so any row can be compared or restored by hand. Nothing else changes.
--
-- Re-running replaces the snapshot. Drop the copies once the cutover has
-- been signed off:
--   DROP TABLE IF EXISTS _bak_024_user, _bak_024_order, _bak_024_ticket,
--     _bak_024_payment, _bak_024_member_event, _bak_024_saved_card,
--     _bak_024_partner, _bak_024_partner_referral, _bak_024_member_referral_code,
--     _bak_024_member_referral;
-- ============================================================================

DROP TABLE IF EXISTS _bak_024_user;                 CREATE TABLE _bak_024_user                 AS TABLE "user";
DROP TABLE IF EXISTS _bak_024_order;                CREATE TABLE _bak_024_order                AS TABLE "order";
DROP TABLE IF EXISTS _bak_024_ticket;               CREATE TABLE _bak_024_ticket               AS TABLE ticket;
DROP TABLE IF EXISTS _bak_024_payment;              CREATE TABLE _bak_024_payment              AS TABLE payment;
DROP TABLE IF EXISTS _bak_024_member_event;         CREATE TABLE _bak_024_member_event         AS TABLE member_event;
DROP TABLE IF EXISTS _bak_024_saved_card;           CREATE TABLE _bak_024_saved_card           AS TABLE saved_card;
DROP TABLE IF EXISTS _bak_024_partner;              CREATE TABLE _bak_024_partner              AS TABLE partner;
DROP TABLE IF EXISTS _bak_024_partner_referral;     CREATE TABLE _bak_024_partner_referral     AS TABLE partner_referral;
DROP TABLE IF EXISTS _bak_024_member_referral_code; CREATE TABLE _bak_024_member_referral_code AS TABLE member_referral_code;
DROP TABLE IF EXISTS _bak_024_member_referral;      CREATE TABLE _bak_024_member_referral      AS TABLE member_referral;

ALTER TABLE _bak_024_user                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bak_024_order                ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bak_024_ticket               ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bak_024_payment              ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bak_024_member_event         ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bak_024_saved_card           ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bak_024_partner              ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bak_024_partner_referral     ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bak_024_member_referral_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bak_024_member_referral      ENABLE ROW LEVEL SECURITY;
