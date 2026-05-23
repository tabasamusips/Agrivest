-- KYC status the KycGuard checks before allowing investment.
-- Mark a user 'verified' once ID + liveness checks pass (the prototype's onboarding).
CREATE TABLE IF NOT EXISTS kyc (
  user_id    TEXT PRIMARY KEY,
  status     TEXT NOT NULL DEFAULT 'pending',   -- pending | verified | rejected
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
