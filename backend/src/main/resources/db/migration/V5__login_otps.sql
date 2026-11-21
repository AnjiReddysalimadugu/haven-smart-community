CREATE TABLE login_otps (
    id UUID PRIMARY KEY,
    email VARCHAR(180) NOT NULL,
    otp_hash VARCHAR(100) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    attempt_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_otps_email_created ON login_otps (email, created_at DESC);
CREATE INDEX idx_login_otps_email_active ON login_otps (email)
    WHERE consumed_at IS NULL;
