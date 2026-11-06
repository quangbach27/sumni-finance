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

-- name: InsertFundSourceStatements :copyfrom
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

-- name: GetLedgerPeriodByUUID :one
SELECT *
FROM ledgers.ledger_periods
WHERE uuid = @uuid;

-- name: UpdateLedgerPeriod :exec
UPDATE ledgers.ledger_periods
SET status = @status,
    closing_balance = COALESCE(sqlc.narg('closing_balance'), closing_balance),
    reopen_reason = COALESCE(sqlc.narg('reopen_reason'), reopen_reason),
    reopened_at = COALESCE(sqlc.narg('reopened_at'), reopened_at),
    reconciled_at = COALESCE(sqlc.narg('reconciled_at'), reconciled_at)
WHERE uuid = @uuid;

-- name: GetUnlockedLedgerPeriodUUID :one
SELECT uuid
FROM ledgers.ledger_periods
WHERE status <> 'reconciled'
ORDER BY open_date DESC
LIMIT 1;

-- name: GetLedgerPeriodReportUUID :one
SELECT report_uuid
FROM ledgers.ledger_periods
WHERE uuid = @uuid;

-- name: UpdateLedgerPeriodReportUUID :exec
UPDATE ledgers.ledger_periods
SET report_uuid = @report_uuid
WHERE uuid = @uuid;

-- name: GetLedgerPeriodWithStatements :many
WITH p AS (
    SELECT *
    FROM ledgers.ledger_periods
    WHERE ledger_periods.uuid = @ledger_period_uuid
)
SELECT
    p.uuid,
    p.name,
    p.opening_balance,
    p.closing_balance,
    p.open_date,
    p.close_date,
    p.status,
    p.reopen_reason,
    p.reopened_at,
    p.reconciled_at,
    p.report_uuid,
    (SELECT COALESCE(SUM(e.amount) FILTER (WHERE e.direction = 'inflow'), 0)
       FROM ledgers.ledger_entries e
      WHERE e.ledger_period_uuid = p.uuid AND e.status = 'posted')::numeric(20, 2) AS total_inflow,
    (SELECT COALESCE(SUM(e.amount) FILTER (WHERE e.direction = 'outflow'), 0)
       FROM ledgers.ledger_entries e
      WHERE e.ledger_period_uuid = p.uuid AND e.status = 'posted')::numeric(20, 2) AS total_outflow,
    (SELECT COUNT(*)
       FROM ledgers.ledger_entries e
      WHERE e.ledger_period_uuid = p.uuid AND e.status = 'posted')::bigint AS entry_count,
    COALESCE(st.uuid::text, '')::text AS statement_uuid,
    COALESCE(st.fund_source_uuid::text, '')::text AS fund_source_uuid,
    st.opening_balance AS statement_opening_balance,
    st.closing_balance AS statement_closing_balance,
    st.actual_balance,
    st.reconciled_by,
    st.reconciled_at AS statement_reconciled_at,
    fs.balance AS current_balance
FROM p
LEFT JOIN ledgers.fund_source_statements st ON st.ledger_period_uuid = p.uuid
LEFT JOIN ledgers.fund_sources fs ON fs.uuid = st.fund_source_uuid
ORDER BY st.created_at, st.uuid;
