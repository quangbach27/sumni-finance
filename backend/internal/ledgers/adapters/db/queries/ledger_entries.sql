-- name: InsertLedgerEntries :copyfrom
INSERT INTO ledgers.ledger_entries (
    uuid,
    org_id,
    ledger_period_uuid,
    fund_source_uuid,
    amount,
    direction,
    description,
    occurred_at,
    category_uuid,
    fs_balance_before,
    fs_balance_after,
    status,
    kind,
    created_by
)
VALUES (
    @uuid,
    @org_id,
    @ledger_period_uuid,
    @fund_source_uuid,
    @amount,
    @direction,
    @description,
    @occurred_at,
    sqlc.narg('category_uuid'),
    @fs_balance_before,
    @fs_balance_after,
    @status,
    @kind,
    @created_by
);

-- name: ListLedgerEntries :many
-- A tag is a sub-category: when the entry's category has a parent, the parent is
-- the category and the entry's own category is the tag.
SELECT
    e.*,
    fs.name AS fund_source_name,
    fs.bank_code AS fund_source_bank_code,
    fs.account_number AS fund_source_account_number,
    lp.name AS period_name,
    lp.status AS period_status,
    c.name AS entry_category_name,
    c.parent_uuid AS parent_category_uuid,
    p.name AS parent_category_name
FROM ledgers.ledger_entries e
JOIN ledgers.fund_sources fs ON fs.uuid = e.fund_source_uuid
JOIN ledgers.ledger_periods lp ON lp.uuid = e.ledger_period_uuid
LEFT JOIN ledgers.categories c ON c.uuid = e.category_uuid
LEFT JOIN ledgers.categories p ON p.uuid = c.parent_uuid
-- Predicate order: tenant (e.org_id, first column of every index) first, then the date range (the filter users pick
-- most), then the scope filters. Keep identical in CountLedgerEntries.
WHERE e.org_id = @org_id
  AND (sqlc.narg('from_date')::timestamptz IS NULL OR e.occurred_at >= sqlc.narg('from_date')::timestamptz)
  AND (sqlc.narg('to_date')::timestamptz IS NULL OR e.occurred_at <= sqlc.narg('to_date')::timestamptz)
  AND (sqlc.narg('ledger_period_uuid')::uuid IS NULL OR e.ledger_period_uuid = sqlc.narg('ledger_period_uuid')::uuid)
  AND (sqlc.narg('fund_source_uuid')::uuid IS NULL OR e.fund_source_uuid = sqlc.narg('fund_source_uuid')::uuid)
  AND (sqlc.narg('kind')::text IS NULL OR e.kind = sqlc.narg('kind')::text)
  AND (sqlc.narg('status')::text IS NULL OR e.status = sqlc.narg('status')::text)
  AND (sqlc.narg('category_uuid')::uuid IS NULL OR c.uuid = sqlc.narg('category_uuid')::uuid OR c.parent_uuid = sqlc.narg('category_uuid')::uuid)
-- Fixed order. The uuid is v7 (time-ordered, monotonic within a process), so within a
-- date it gives the order the entries were created in.
ORDER BY e.occurred_at DESC, e.uuid DESC
LIMIT @page_limit
OFFSET @page_offset;

-- name: CountLedgerEntries :one
SELECT count(*)
FROM ledgers.ledger_entries e
LEFT JOIN ledgers.categories c ON c.uuid = e.category_uuid
-- Same predicate order as ListLedgerEntries.
WHERE e.org_id = @org_id
  AND (sqlc.narg('from_date')::timestamptz IS NULL OR e.occurred_at >= sqlc.narg('from_date')::timestamptz)
  AND (sqlc.narg('to_date')::timestamptz IS NULL OR e.occurred_at <= sqlc.narg('to_date')::timestamptz)
  AND (sqlc.narg('ledger_period_uuid')::uuid IS NULL OR e.ledger_period_uuid = sqlc.narg('ledger_period_uuid')::uuid)
  AND (sqlc.narg('fund_source_uuid')::uuid IS NULL OR e.fund_source_uuid = sqlc.narg('fund_source_uuid')::uuid)
  AND (sqlc.narg('kind')::text IS NULL OR e.kind = sqlc.narg('kind')::text)
  AND (sqlc.narg('status')::text IS NULL OR e.status = sqlc.narg('status')::text)
  AND (sqlc.narg('category_uuid')::uuid IS NULL OR c.uuid = sqlc.narg('category_uuid')::uuid OR c.parent_uuid = sqlc.narg('category_uuid')::uuid);

-- name: GetLatestLedgerEntryOccurredAt :one
SELECT occurred_at
FROM ledgers.ledger_entries
WHERE org_id = @org_id
  AND fund_source_uuid = @fund_source_uuid
ORDER BY occurred_at DESC
LIMIT 1;

-- name: GetLedgerEntry :one
SELECT
    e.*,
    fs.name AS fund_source_name,
    fs.bank_code AS fund_source_bank_code,
    fs.account_number AS fund_source_account_number,
    lp.name AS period_name,
    lp.status AS period_status,
    c.name AS entry_category_name,
    c.parent_uuid AS parent_category_uuid,
    p.name AS parent_category_name
FROM ledgers.ledger_entries e
JOIN ledgers.fund_sources fs ON fs.uuid = e.fund_source_uuid
JOIN ledgers.ledger_periods lp ON lp.uuid = e.ledger_period_uuid
LEFT JOIN ledgers.categories c ON c.uuid = e.category_uuid
LEFT JOIN ledgers.categories p ON p.uuid = c.parent_uuid
WHERE e.org_id = @org_id
  AND e.uuid = @uuid;

-- name: GetLedgerEntryByUUID :one
SELECT *
FROM ledgers.ledger_entries
WHERE org_id = @org_id
  AND uuid = @uuid;

-- name: MarkLedgerEntryVoided :exec
UPDATE ledgers.ledger_entries
SET status = @status,
    reversed_by_entry_uuid = @reversed_by_entry_uuid,
    voided_reason = @voided_reason,
    voided_by = @voided_by,
    voided_at = @voided_at
WHERE org_id = @org_id
  AND uuid = @uuid;
