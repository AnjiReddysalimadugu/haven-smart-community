CREATE TABLE IF NOT EXISTS audit_events (
    id            UUID PRIMARY KEY,
    action        VARCHAR(64)  NOT NULL,
    entity_type   VARCHAR(64)  NOT NULL,
    entity_id     UUID,
    summary       VARCHAR(512) NOT NULL,
    actor_id      UUID,
    actor_name    VARCHAR(160),
    apartment_id  UUID,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_apartment ON audit_events (apartment_id, created_at DESC);

ALTER TABLE push_tokens ALTER COLUMN token TYPE TEXT;
ALTER TABLE push_tokens ALTER COLUMN platform TYPE VARCHAR(32);
