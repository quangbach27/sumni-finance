BEGIN;

CREATE TABLE ledgers.ledger_periods (
    uuid            uuid PRIMARY KEY,
    name            text NOT NULL,
    opening_balance numeric(20, 2) NOT NULL CHECK (opening_balance >= 0),
    closing_balance numeric(20, 2) CHECK (closing_balance >= 0),
    open_date       timestamptz NOT NULL,
    close_date      timestamptz NOT NULL,
    status          text NOT NULL CHECK (status IN ('opened', 'closed', 'reconciled')),
    reopen_reason   text,
    reopened_at     timestamptz,
    reconciled_at   timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ledger_periods_dates_valid CHECK (close_date >= open_date),
    CONSTRAINT ledger_periods_reconciled_fields CHECK (
        status <> 'reconciled'
        OR (closing_balance IS NOT NULL AND reconciled_at IS NOT NULL)
    )
);

-- At most one unlocked (opened or closed) period at a time.
CREATE UNIQUE INDEX ledger_periods_single_unlocked
    ON ledgers.ledger_periods ((true))
    WHERE status <> 'reconciled';

COMMIT;
