BEGIN;

CREATE TABLE ledgers.ledger_period_reports (
    uuid       uuid PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ledgers.ledger_periods
    ADD COLUMN report_uuid uuid UNIQUE REFERENCES ledgers.ledger_period_reports (uuid);

COMMIT;
