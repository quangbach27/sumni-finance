-- name: ExistsUnlockedLedgerPeriod :one
SELECT EXISTS (
    SELECT 1
    FROM ledgers.ledger_periods
    WHERE status <> 'reconciled'
);


-- name: CreateLedgerPeriod :exec
INSERT INTO ledgers.ledger_periods (
    uuid,
    name,
    opening_balance,
    open_date,
    close_date,
    status
)
VALUES (
    @uuid,
    @name,
    @opening_balance,
    @open_date,
    @close_date,
    @status
);

-- name: CreateFundSourceStatement :exec
INSERT INTO ledgers.fund_source_statements (
    uuid,
    ledger_period_uuid,
    fund_source_uuid,
    opening_balance
)
VALUES (
    @uuid,
    @ledger_period_uuid,
    @fund_source_uuid,
    @opening_balance
);

-- name: ListLedgerPeriods :many
SELECT *
FROM ledgers.ledger_periods
WHERE (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status')::text)
ORDER BY open_date DESC, created_at DESC
LIMIT @page_limit 
OFFSET @page_offset;

-- name: CountLedgerPeriods :one
SELECT count(*)
FROM ledgers.ledger_periods
WHERE (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status')::text);
