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
