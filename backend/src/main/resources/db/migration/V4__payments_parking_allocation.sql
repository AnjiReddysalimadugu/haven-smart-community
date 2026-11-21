-- Dedicated payment / receipt ledger
CREATE TABLE bill_payments (
    id UUID PRIMARY KEY,
    bill_id UUID NOT NULL REFERENCES bills(id),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    method VARCHAR(40) NOT NULL,
    reference VARCHAR(80) NOT NULL,
    receipt_number VARCHAR(40) NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_bill_payments_receipt UNIQUE (receipt_number)
);

CREATE INDEX idx_bill_payments_bill ON bill_payments(bill_id);
CREATE INDEX idx_bill_payments_paid_at ON bill_payments(paid_at DESC);

-- Parking slot allocation to a flat
ALTER TABLE parking_slots
    ADD COLUMN flat_id UUID REFERENCES flats(id),
    ADD COLUMN vehicle_number VARCHAR(40),
    ADD COLUMN allocated_at TIMESTAMPTZ;

CREATE INDEX idx_parking_slots_flat ON parking_slots(flat_id);
