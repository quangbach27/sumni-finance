-- name: CreateLedgerPeriodReport :exec
INSERT INTO ledgers.ledger_period_reports (uuid)
VALUES (@uuid);
