-- name: ListFundSourceStatementsByPeriod :many
SELECT *
FROM ledgers.fund_source_statements
WHERE ledger_period_uuid = @ledger_period_uuid
ORDER BY created_at, uuid;

-- name: ListFundSourceStatementsByUUIDsInPeriod :many
SELECT *
FROM ledgers.fund_source_statements
WHERE ledger_period_uuid = @ledger_period_uuid
  AND uuid = ANY(@uuids::uuid[]);

-- name: UpdateFundSourceStatement :batchexec
UPDATE ledgers.fund_source_statements
SET closing_balance = COALESCE(sqlc.narg('closing_balance'), closing_balance),
    actual_balance = COALESCE(sqlc.narg('actual_balance'), actual_balance),
    reconciled_by = COALESCE(sqlc.narg('reconciled_by'), reconciled_by),
    reconciled_at = COALESCE(sqlc.narg('reconciled_at'), reconciled_at)
WHERE uuid = @uuid;
