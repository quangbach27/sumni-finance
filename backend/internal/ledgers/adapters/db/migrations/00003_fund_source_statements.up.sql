CREATE TABLE ledgers.fund_source_statements (
    uuid               uuid PRIMARY KEY,
    ledger_period_uuid uuid NOT NULL REFERENCES ledgers.ledger_periods (uuid),
    fund_source_uuid   uuid NOT NULL REFERENCES ledgers.fund_sources (uuid),
    opening_balance    numeric(20, 2) NOT NULL CHECK (opening_balance >= 0),
    closing_balance    numeric(20, 2) CHECK (closing_balance >= 0),
    actual_balance     numeric(20, 2) CHECK (actual_balance >= 0),
    reconciled_by      text,
    reconciled_at      timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fund_source_statements_unique UNIQUE (ledger_period_uuid, fund_source_uuid),
    CONSTRAINT fund_source_statements_reconciled_fields CHECK (
        (reconciled_at IS NULL) = (actual_balance IS NULL AND reconciled_by IS NULL)
        AND (reconciled_at IS NULL OR closing_balance IS NOT NULL)
    )
);
