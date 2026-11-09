BEGIN;

-- A category (parent_uuid IS NULL) or a sub-category of one. Shared by all
-- periods. office_uuid will be added here when offices exist, and the
-- top-level unique index below will include it.
CREATE TABLE ledgers.categories (
    uuid        uuid PRIMARY KEY,
    parent_uuid uuid REFERENCES ledgers.categories (uuid),
    name        varchar(255) NOT NULL,
    description text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- NOT VALID: entries posted before categories existed may hold unknown UUIDs.
ALTER TABLE ledgers.ledger_entries
    ADD CONSTRAINT ledger_entries_category_fk
    FOREIGN KEY (category_uuid) REFERENCES ledgers.categories (uuid) NOT VALID;

COMMIT;
