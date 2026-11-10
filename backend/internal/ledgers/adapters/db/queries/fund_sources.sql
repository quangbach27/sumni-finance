-- name: CreateFundSource :exec
INSERT INTO ledgers.fund_sources (
    uuid,
    name,
    type,
    balance,
    currency,
    owner_name,
    bank_code,
    bank_bin,
    bank_short_name,
    account_number
)
VALUES (
    @uuid,
    @name,
    @type,
    @balance,
    @currency,
    @owner_name,
    sqlc.narg('bank_code'),
    sqlc.narg('bank_bin'),
    sqlc.narg('bank_short_name'),
    sqlc.narg('account_number')
);

-- name: GetFundSourceByID :one
SELECT *
FROM ledgers.fund_sources
WHERE uuid = @uuid;

-- name: ListFundSources :many
SELECT *
FROM ledgers.fund_sources
ORDER BY created_at DESC;

-- name: ListFundSourcesByUUIDs :many
SELECT *
FROM ledgers.fund_sources
WHERE uuid = ANY(@uuids::uuid[])
ORDER BY created_at;

-- name: ListFundSourcesByUUIDsInPeriod :many
SELECT fs.*
FROM ledgers.fund_sources fs
JOIN ledgers.fund_source_statements st ON st.fund_source_uuid = fs.uuid
WHERE st.ledger_period_uuid = @ledger_period_uuid
  AND fs.uuid = ANY(@uuids::uuid[])
ORDER BY fs.created_at;

-- name: UpdateFundSourceBalance :batchexec
UPDATE ledgers.fund_sources
SET balance = @balance
WHERE uuid = @uuid;
