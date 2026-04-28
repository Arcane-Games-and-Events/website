-- Migration 011: AGE Partner Program
-- Adds partner + partner_referral tables and user.used_partner_code column.

-- Track the partner code a user has redeemed (enforces one-per-user)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS used_partner_code TEXT;

-- Partners (1:1 with user)
CREATE TABLE IF NOT EXISTS partner (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    payout_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT REFERENCES "user"(id)
);

CREATE INDEX IF NOT EXISTS idx_partner_code ON partner (code);
CREATE INDEX IF NOT EXISTS idx_partner_user_id ON partner (user_id);

-- Referrals: one row per redeemed code + first charge
CREATE TABLE IF NOT EXISTS partner_referral (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partner(id),
    referred_user_id TEXT NOT NULL REFERENCES "user"(id),
    code TEXT NOT NULL,
    subscription_type TEXT NOT NULL, -- 'monthly' | 'yearly'
    discount_amount NUMERIC(10, 2) NOT NULL,
    commission_amount NUMERIC(10, 2) NOT NULL,
    first_charge_order_id UUID REFERENCES "order"(id),
    payout_status TEXT DEFAULT 'pending', -- 'pending' | 'paid'
    paid_at TIMESTAMPTZ,
    paid_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_referral_partner_id ON partner_referral (partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referral_referred_user_id ON partner_referral (referred_user_id);
CREATE INDEX IF NOT EXISTS idx_partner_referral_payout_status ON partner_referral (payout_status);
