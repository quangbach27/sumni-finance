CREATE SCHEMA IF NOT EXISTS ledgers;

CREATE TABLE ledgers.fund_sources (
    uuid            uuid PRIMARY KEY,
    name            text NOT NULL,
    type            text NOT NULL CHECK (type IN ('bank', 'cash')),
    balance         numeric(20, 2) NOT NULL CHECK (balance >= 0),
    currency        text NOT NULL,
    owner_name      text NOT NULL,
    bank_code       text,
    bank_bin        integer,
    bank_short_name text,
    account_number  text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fund_sources_bank_details_required CHECK (
        type <> 'bank'
        OR (
            bank_code IS NOT NULL
            AND bank_bin IS NOT NULL
            AND bank_short_name IS NOT NULL
            AND account_number IS NOT NULL
        )
    )
);
