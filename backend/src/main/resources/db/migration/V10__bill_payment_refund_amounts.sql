-- Refunds append ledger rows with negative amounts (method = REFUND).
-- Original V4 required amount > 0, which blocked the refund workflow.
ALTER TABLE bill_payments DROP CONSTRAINT IF EXISTS bill_payments_amount_check;
ALTER TABLE bill_payments ADD CONSTRAINT bill_payments_amount_check CHECK (amount <> 0);
