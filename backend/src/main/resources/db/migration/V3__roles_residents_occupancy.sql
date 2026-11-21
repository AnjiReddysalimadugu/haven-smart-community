-- P0: migrate legacy ADMIN → APARTMENT_ADMIN (SUPER_ADMIN / APARTMENT_ADMIN introduced in app)
UPDATE app_users SET role = 'APARTMENT_ADMIN' WHERE role = 'ADMIN';

CREATE TABLE flat_occupancies (
    id UUID PRIMARY KEY,
    flat_id UUID NOT NULL REFERENCES flats(id),
    resident_user_id UUID NOT NULL REFERENCES app_users(id),
    occupancy_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    allocated_by UUID REFERENCES app_users(id),
    notes VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_occupancy_type CHECK (occupancy_type IN ('OWNER', 'TENANT')),
    CONSTRAINT ck_occupancy_status CHECK (status IN ('ACTIVE', 'ENDED')),
    CONSTRAINT ck_occupancy_ended_at CHECK (
        (status = 'ACTIVE' AND ended_at IS NULL) OR (status = 'ENDED' AND ended_at IS NOT NULL)
    )
);

-- At most one active assignment per flat
CREATE UNIQUE INDEX uk_flat_occupancy_active
    ON flat_occupancies (flat_id)
    WHERE status = 'ACTIVE';

-- At most one active assignment per resident
CREATE UNIQUE INDEX uk_resident_occupancy_active
    ON flat_occupancies (resident_user_id)
    WHERE status = 'ACTIVE';

CREATE INDEX idx_occupancies_flat ON flat_occupancies (flat_id);
CREATE INDEX idx_occupancies_resident ON flat_occupancies (resident_user_id);
CREATE INDEX idx_occupancies_status ON flat_occupancies (status);

-- Backfill active occupancy for existing residents already bound to a flat
INSERT INTO flat_occupancies (id, flat_id, resident_user_id, occupancy_type, status, started_at, ended_at, allocated_by, notes, created_at)
SELECT gen_random_uuid(),
       u.flat_id,
       u.id,
       CASE WHEN f.status = 'TENANT_OCCUPIED' THEN 'TENANT' ELSE 'OWNER' END,
       'ACTIVE',
       COALESCE(u.created_at, now()),
       NULL,
       NULL,
       'Backfilled from app_users.flat_id during P0 migration',
       now()
FROM app_users u
JOIN flats f ON f.id = u.flat_id
WHERE u.role = 'RESIDENT'
  AND u.flat_id IS NOT NULL
  AND u.active = TRUE
  AND NOT EXISTS (
      SELECT 1 FROM flat_occupancies o
      WHERE o.flat_id = u.flat_id AND o.status = 'ACTIVE'
  );
