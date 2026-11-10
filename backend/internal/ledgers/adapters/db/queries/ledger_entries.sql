-- name: InsertLedgerEntries :copyfrom
INSERT INTO ledgers.ledger_entries (
    uuid,
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
    kind
)
VALUES (
    @uuid,
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
    @kind
);
