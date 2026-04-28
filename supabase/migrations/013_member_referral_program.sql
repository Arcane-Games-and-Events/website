-- Migration 013: Member Referral Program
-- Premium users get a personal referral code. New users sign up free for the
-- first month, and once they pay for their second month the referrer earns
-- one free month of premium.

CREATE TABLE IF NOT EXISTS member_referral_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_referral_code_code ON member_referral_code (code);
CREATE INDEX IF NOT EXISTS idx_member_referral_code_user_id ON member_referral_code (user_id);

CREATE TABLE IF NOT EXISTS member_referral (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id TEXT NOT NULL REFERENCES "user"(id),
    referred_user_id TEXT NOT NULL REFERENCES "user"(id),
    code TEXT NOT NULL,
    subscription_type TEXT NOT NULL, -- 'monthly' | 'yearly'
    status TEXT DEFAULT 'pending', -- 'pending' | 'reward_earned' | 'reward_applied' | 'cancelled'
    reward_earned_at TIMESTAMPTZ,
    reward_applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_referral_referrer ON member_referral (referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_member_referral_referred ON member_referral (referred_user_id);
CREATE INDEX IF NOT EXISTS idx_member_referral_status ON member_referral (status);
