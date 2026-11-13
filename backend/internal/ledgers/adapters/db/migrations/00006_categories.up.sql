BEGIN;

-- A category (parent_uuid IS NULL) or a sub-category of one. Shared by all
-- periods of one org. Names are unique per level, ignoring case.
CREATE TABLE ledgers.categories (
    uuid        uuid PRIMARY KEY,
    org_id      text NOT NULL,
    parent_uuid uuid REFERENCES ledgers.categories (uuid),
    name        varchar(255) NOT NULL,
    description text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX categories_top_level_name_unique
    ON ledgers.categories (org_id, lower(name))
    WHERE parent_uuid IS NULL;

CREATE UNIQUE INDEX categories_sub_category_name_unique
    ON ledgers.categories (parent_uuid, lower(name))
    WHERE parent_uuid IS NOT NULL;

-- NOT VALID: entries posted before categories existed may hold unknown UUIDs.
ALTER TABLE ledgers.ledger_entries
    ADD CONSTRAINT ledger_entries_category_fk
    FOREIGN KEY (category_uuid) REFERENCES ledgers.categories (uuid) NOT VALID;

COMMIT;
