BEGIN;

ALTER TABLE ledgers.ledger_periods DROP COLUMN report_uuid;

DROP TABLE ledgers.ledger_period_reports;

COMMIT;
