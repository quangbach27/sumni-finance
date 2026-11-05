package db

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"

	"backend/internal/ledgers/domain"
)

type LedgerEntryRepo struct {
	db *pgxpool.Pool
}

var _ domain.LedgerEntryRepository = (*LedgerEntryRepo)(nil)

func NewLedgerEntryRepository(db *pgxpool.Pool) (*LedgerEntryRepo, error) {
	if db == nil {
		return nil, errors.New("db can't be nil")
	}

	return &LedgerEntryRepo{db: db}, nil
}

// TODO: insert the entries in a single transaction.
func (r *LedgerEntryRepo) PostJournalEntries(ctx context.Context, entries []*domain.LedgerEntry) error {
	return errNotImplemented
}

// TODO: lock the entry row (FOR UPDATE), call voidFn, save the voided entry
// and insert the reversal entry in a single transaction.
func (r *LedgerEntryRepo) VoidEntry(
	ctx context.Context,
	ledgerEntryUUID domain.LedgerEntryUUID,
	voidFn func(*domain.LedgerEntry) (*domain.LedgerEntry, error),
) error {
	return errNotImplemented
}
