BEGIN;

ALTER TABLE ledgers.ledger_entries DROP CONSTRAINT ledger_entries_category_fk;

DROP TABLE ledgers.categories;

COMMIT;
