BEGIN;

-- One report per ledger period, generated once the period is reconciled.
-- snapshot is the frozen report (models.ReportSnapshot as json).
CREATE TABLE ledgers.ledger_period_reports (
    uuid       uuid PRIMARY KEY,
    org_id     text NOT NULL,
    snapshot   jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ledgers.ledger_periods
    ADD COLUMN report_uuid uuid UNIQUE REFERENCES ledgers.ledger_period_reports (uuid);

COMMIT;
