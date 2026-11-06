BEGIN;

CREATE TABLE ledgers.ledger_entries (
    uuid                  uuid PRIMARY KEY,
    ledger_period_uuid    uuid NOT NULL REFERENCES ledgers.ledger_periods (uuid),
    fund_source_uuid      uuid NOT NULL REFERENCES ledgers.fund_sources (uuid),
    amount                numeric(20, 2) NOT NULL CHECK (amount > 0),
    direction             text NOT NULL CHECK (direction IN ('inflow', 'outflow')),
    description           text NOT NULL,
    occurred_at           timestamptz NOT NULL,
    category_uuid         uuid,
    -- fund source balance right before and after this entry was applied
    fs_balance_before     numeric(20, 2) NOT NULL CHECK (fs_balance_before >= 0),
    fs_balance_after      numeric(20, 2) NOT NULL CHECK (fs_balance_after >= 0),
    status                text NOT NULL CHECK (status IN ('posted', 'voided')),
    kind                  text NOT NULL CHECK (kind IN ('normal', 'reversal')),
    reversed_by_entry_uuid uuid REFERENCES ledgers.ledger_entries (uuid),
    reverses_entry_uuid   uuid REFERENCES ledgers.ledger_entries (uuid),
    voided_reason         text,
    voided_by             text,
    voided_at             timestamptz,
    created_at            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ledger_entries_balance_matches_direction CHECK (
        (direction = 'inflow' AND fs_balance_after = fs_balance_before + amount)
        OR (direction = 'outflow' AND fs_balance_after = fs_balance_before - amount)
    ),
    CONSTRAINT ledger_entries_void_fields CHECK (
        (status = 'voided') = (voided_reason IS NOT NULL AND voided_by IS NOT NULL AND voided_at IS NOT NULL AND reversed_by_entry_uuid IS NOT NULL)
    ),
    CONSTRAINT ledger_entries_reversal_fields CHECK (
        (kind = 'reversal') = (reverses_entry_uuid IS NOT NULL)
    )
);

CREATE INDEX ledger_entries_fund_source_occurred_at_idx
    ON ledgers.ledger_entries (fund_source_uuid, occurred_at);

CREATE INDEX ledger_entries_ledger_period_idx
    ON ledgers.ledger_entries (ledger_period_uuid);

COMMIT;
