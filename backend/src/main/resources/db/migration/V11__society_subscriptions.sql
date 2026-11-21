-- Platform SaaS billing: what societies pay Haven (not flat electricity/water).
CREATE TABLE society_subscriptions (
    id              UUID PRIMARY KEY,
    apartment_id    UUID NOT NULL REFERENCES apartments(id),
    plan_code       VARCHAR(40) NOT NULL,
    plan_name       VARCHAR(120) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'TRIAL',
    amount_monthly  NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency        VARCHAR(8) NOT NULL DEFAULT 'INR',
    seats_included  INT NOT NULL DEFAULT 50,
    features_json   TEXT NOT NULL DEFAULT '[]',
    payment_link    VARCHAR(500),
    next_due_on     DATE,
    notes           VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_society_subscriptions_apartment UNIQUE (apartment_id)
);

CREATE TABLE society_subscription_payments (
    id                UUID PRIMARY KEY,
    subscription_id   UUID NOT NULL REFERENCES society_subscriptions(id) ON DELETE CASCADE,
    amount            NUMERIC(12,2) NOT NULL,
    currency          VARCHAR(8) NOT NULL DEFAULT 'INR',
    paid_on           DATE NOT NULL,
    method            VARCHAR(40) NOT NULL DEFAULT 'UPI',
    reference         VARCHAR(120),
    notes             VARCHAR(500),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_society_sub_status ON society_subscriptions(status);
CREATE INDEX idx_society_sub_pay_sub ON society_subscription_payments(subscription_id);
