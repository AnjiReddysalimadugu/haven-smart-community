-- Family members per flat
CREATE TABLE family_members (
    id              UUID PRIMARY KEY,
    flat_id         UUID NOT NULL REFERENCES flats(id),
    full_name       VARCHAR(120) NOT NULL,
    relation        VARCHAR(40) NOT NULL,
    mobile          VARCHAR(20),
    age             INTEGER,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_family_flat ON family_members(flat_id);

-- Society notices
CREATE TABLE notices (
    id              UUID PRIMARY KEY,
    apartment_id    UUID NOT NULL REFERENCES apartments(id),
    title           VARCHAR(160) NOT NULL,
    body            VARCHAR(4000) NOT NULL,
    published_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    created_by      UUID,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notices_apartment ON notices(apartment_id, published_at DESC);

-- Gate emergency contacts
CREATE TABLE emergency_contacts (
    id              UUID PRIMARY KEY,
    apartment_id    UUID NOT NULL REFERENCES apartments(id),
    name            VARCHAR(120) NOT NULL,
    role_label      VARCHAR(80) NOT NULL,
    phone           VARCHAR(30) NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_emergency_apartment ON emergency_contacts(apartment_id, sort_order);

-- Visitor approval workflow
ALTER TABLE visitor_passes
    ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN approved_at TIMESTAMPTZ,
    ADD COLUMN approved_by UUID,
    ADD COLUMN created_by UUID,
    ADD COLUMN rejection_reason VARCHAR(500);

CREATE INDEX idx_visitor_approval ON visitor_passes(approval_status);

-- Complaint status history + completion evidence
CREATE TABLE complaint_status_history (
    id              UUID PRIMARY KEY,
    complaint_id    UUID NOT NULL REFERENCES complaints(id),
    from_status     VARCHAR(24),
    to_status       VARCHAR(24) NOT NULL,
    actor_user_id   UUID,
    actor_name      VARCHAR(120),
    note            VARCHAR(2000),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_complaint_history ON complaint_status_history(complaint_id, created_at);

ALTER TABLE complaints
    ADD COLUMN evidence_url VARCHAR(1000);

-- One active vehicle number per society (when allocated)
CREATE UNIQUE INDEX uk_parking_active_vehicle
    ON parking_slots (apartment_id, upper(vehicle_number))
    WHERE vehicle_number IS NOT NULL AND flat_id IS NOT NULL AND active = TRUE;
