CREATE TABLE apartments (
 id UUID PRIMARY KEY, name VARCHAR(140) NOT NULL, address VARCHAR(240) NOT NULL,
 timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Kolkata', status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE blocks (
 id UUID PRIMARY KEY, apartment_id UUID NOT NULL REFERENCES apartments(id),
 name VARCHAR(80) NOT NULL, code VARCHAR(20) NOT NULL,
 CONSTRAINT uk_blocks_apartment_code UNIQUE(apartment_id,code)
);
CREATE TABLE floors (
 id UUID PRIMARY KEY, block_id UUID NOT NULL REFERENCES blocks(id),
 floor_number INTEGER NOT NULL, name VARCHAR(80) NOT NULL,
 CONSTRAINT uk_floors_block_number UNIQUE(block_id,floor_number)
);
CREATE TABLE flats (
 id UUID PRIMARY KEY, floor_id UUID NOT NULL REFERENCES floors(id),
 flat_number VARCHAR(30) NOT NULL, area_sqft NUMERIC(10,2), bedroom_count INTEGER,
 status VARCHAR(24) NOT NULL DEFAULT 'AVAILABLE',
 CONSTRAINT uk_flats_floor_number UNIQUE(floor_id,flat_number)
);
CREATE TABLE bills (
 id UUID PRIMARY KEY, flat_id UUID NOT NULL REFERENCES flats(id),
 bill_type VARCHAR(30) NOT NULL, billing_period VARCHAR(7) NOT NULL,
 amount NUMERIC(12,2) NOT NULL CHECK(amount > 0), paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
 due_date DATE NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PENDING', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT uk_bill_period_type UNIQUE(flat_id,bill_type,billing_period)
);
CREATE TABLE visitor_passes (
 id UUID PRIMARY KEY, flat_id UUID NOT NULL REFERENCES flats(id), visitor_name VARCHAR(120) NOT NULL,
 mobile VARCHAR(20), visit_type VARCHAR(30) NOT NULL, token_hash VARCHAR(64) NOT NULL UNIQUE,
 expires_at TIMESTAMPTZ NOT NULL, used BOOLEAN NOT NULL DEFAULT FALSE, entry_at TIMESTAMPTZ,
 exit_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE parking_slots (
 id UUID PRIMARY KEY, apartment_id UUID NOT NULL REFERENCES apartments(id),
 slot_code VARCHAR(30) NOT NULL, vehicle_type VARCHAR(20) NOT NULL,
 monthly_charge NUMERIC(10,2) NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT TRUE,
 CONSTRAINT uk_parking_apartment_slot UNIQUE(apartment_id,slot_code)
);
CREATE TABLE complaints (
 id UUID PRIMARY KEY, flat_id UUID NOT NULL REFERENCES flats(id), title VARCHAR(140) NOT NULL,
 category VARCHAR(30) NOT NULL, description VARCHAR(2000) NOT NULL, status VARCHAR(24) NOT NULL DEFAULT 'RAISED',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blocks_apartment ON blocks(apartment_id);
CREATE INDEX idx_floors_block ON floors(block_id);
CREATE INDEX idx_flats_floor ON flats(floor_id);
CREATE INDEX idx_bills_flat_period ON bills(flat_id,billing_period);
CREATE INDEX idx_bills_status_due ON bills(status,due_date);
CREATE INDEX idx_visitors_expiry ON visitor_passes(expires_at);
CREATE INDEX idx_complaints_status ON complaints(status);
