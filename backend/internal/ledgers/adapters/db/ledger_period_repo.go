package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	common "github.com/quangbach27/golang-common"
	commonDb "github.com/quangbach27/golang-common/db"

	"backend/internal/ledgers/adapters/db/dbmodels"
	"backend/internal/ledgers/domain"
)

var errNotImplemented = errors.New("not implemented")

type LedgerPeriodRepo struct {
	db *pgxpool.Pool
}

var _ domain.LedgerPeriodRepository = (*LedgerPeriodRepo)(nil)

func NewLedgerPeriodRepository(db *pgxpool.Pool) (*LedgerPeriodRepo, error) {
	if db == nil {
		return nil, errors.New("db can't be nil")
	}

	return &LedgerPeriodRepo{db: db}, nil
}

func (r *LedgerPeriodRepo) OpenLedgerPeriod(
	ctx context.Context,
	fundSourceUUIDs []domain.FundSourceUUID,
	createFn func(fundSources []*domain.FundSource) (*domain.LedgerPeriod, error),
) error {
	err := commonDb.UpdateInSerializableTx(ctx, r.db, func(ctx context.Context, tx pgx.Tx) error {
		q := dbmodels.New(tx)

		unlocked, err := q.ExistsUnlockedLedgerPeriod(ctx)
		if err != nil {
			return err
		}
		if unlocked {
			return common.NewConflictError("unlocked-period-exists", "an unlocked ledger period already exists")
		}

		fundSources, err := listFundSourcesByUUIDs(ctx, q, fundSourceUUIDs)
		if err != nil {
			return err
		}

		period, err := createFn(fundSources)
		if err != nil {
			return err
		}
		if period == nil {
			return errors.New("createFn returned a nil ledger period")
		}

		if err := saveLedgerPeriod(ctx, q, period); err != nil {
			return err
		}

		return saveFundSourceStatements(ctx, q, period, fundSources)
	})
	if err != nil {
		var cerr common.Error
		if errors.As(err, &cerr) {
			return err
		}

		return fmt.Errorf("open ledger period: %w", err)
	}

	return nil
}

func (r *LedgerPeriodRepo) PostJournalEntries(
	ctx context.Context,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
	fundSourceUUIDs []domain.FundSourceUUID,
	postFn func(period *domain.LedgerPeriod, fundSources map[domain.FundSourceUUID]*domain.FundSource) ([]*domain.LedgerEntry, error),
) error {
	if ledgerPeriodUUID.IsZero() {
		return common.NewInvalidInputError("ledger-period-required", "ledger period is required")
	}
	err := commonDb.UpdateInSerializableTx(ctx, r.db, func(ctx context.Context, tx pgx.Tx) error {
		q := dbmodels.New(tx)

		period, err := getLedgerPeriodByUUID(ctx, q, ledgerPeriodUUID)
		if err != nil {
			return err
		}

		fundSources, err := listFundSourcesInPeriod(ctx, q, ledgerPeriodUUID, fundSourceUUIDs)
		if err != nil {
			return err
		}

		entries, err := postFn(period, fundSources)
		if err != nil {
			return err
		}

		if err := saveJournalEntries(ctx, q, entries); err != nil {
			return err
		}

		return updateFundSourceBalances(ctx, q, fundSources)
	})
	if err != nil {
		var cerr common.Error
		if errors.As(err, &cerr) {
			return err
		}

		return fmt.Errorf("post journal entries: %w", err)
	}

	return nil
}

func getLedgerPeriodByUUID(
	ctx context.Context,
	q *dbmodels.Queries,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
) (*domain.LedgerPeriod, error) {
	row, err := q.GetLedgerPeriodByUUID(ctx, ledgerPeriodUUID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, common.NewNotFoundError("ledger-period-not-found", "ledger period %s was not found", ledgerPeriodUUID.String())
		}

		return nil, err
	}

	return ledgerPeriodToDomain(row), nil
}

// listFundSourcesByUUIDs validates the UUIDs (not empty, not zero, no
// duplicates) and loads the fund sources, failing if any is missing.
func listFundSourcesByUUIDs(
	ctx context.Context,
	q *dbmodels.Queries,
	fundSourceUUIDs []domain.FundSourceUUID,
) ([]*domain.FundSource, error) {
	if err := validateFundSourceUUIDs(fundSourceUUIDs); err != nil {
		return nil, err
	}

	uuids := toCommonUUIDs(fundSourceUUIDs)

	rows, err := q.ListFundSourcesByUUIDs(ctx, uuids)
	if err != nil {
		return nil, err
	}
	if len(rows) != len(uuids) {
		return nil, common.NewNotFoundError("fund-source-not-found", "one or more fund sources were not found")
	}

	fundSources := make([]*domain.FundSource, 0, len(rows))
	for _, row := range rows {
		fs, err := fundSourceToDomain(row)
		if err != nil {
			return nil, err
		}

		fundSources = append(fundSources, fs)
	}

	return fundSources, nil
}

func toCommonUUIDs(ids []domain.FundSourceUUID) []common.UUID {
	uuids := make([]common.UUID, 0, len(ids))
	for _, id := range ids {
		uuids = append(uuids, id.UUID)
	}

	return uuids
}

func saveLedgerPeriod(ctx context.Context, q *dbmodels.Queries, period *domain.LedgerPeriod) error {
	return q.CreateLedgerPeriod(ctx, ledgerPeriodToCreateParams(period))
}

// saveFundSourceStatements inserts one statement per fund source, opening at
// the fund source's current balance, in a single batch.
func saveFundSourceStatements(
	ctx context.Context,
	q *dbmodels.Queries,
	period *domain.LedgerPeriod,
	fundSources []*domain.FundSource,
) error {
	params := make([]dbmodels.InsertFundSourceStatementsParams, 0, len(fundSources))
	for _, fs := range fundSources {
		st, err := domain.NewFundSourceStatement(period.UUID(), fs.UUID(), fs.Balance())
		if err != nil {
			return err
		}

		params = append(params, fundSourceStatementToInsertParams(st))
	}

	_, err := q.InsertFundSourceStatements(ctx, params)

	return err
}

// listFundSourcesInPeriod validates the UUIDs (not empty, not zero, no
// duplicates) and loads the fund sources, failing unless each one has a
// statement in the period.
func listFundSourcesInPeriod(
	ctx context.Context,
	q *dbmodels.Queries,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
	fundSourceUUIDs []domain.FundSourceUUID,
) (map[domain.FundSourceUUID]*domain.FundSource, error) {
	if err := validateFundSourceUUIDs(fundSourceUUIDs); err != nil {
		return nil, err
	}

	uuids := toCommonUUIDs(fundSourceUUIDs)

	rows, err := q.ListFundSourcesByUUIDsInPeriod(ctx, dbmodels.ListFundSourcesByUUIDsInPeriodParams{
		LedgerPeriodUuid: ledgerPeriodUUID,
		Uuids:            uuids,
	})
	if err != nil {
		return nil, err
	}
	if len(rows) != len(uuids) {
		return nil, common.NewInvalidInputError("fund-source-not-in-period", "one or more fund sources do not belong to the ledger period")
	}

	fundSources := make(map[domain.FundSourceUUID]*domain.FundSource, len(rows))
	for _, row := range rows {
		fs, err := fundSourceToDomain(row)
		if err != nil {
			return nil, err
		}

		fundSources[fs.UUID()] = fs
	}

	return fundSources, nil
}

// saveJournalEntries inserts the entries. Each entry must have its fund source
// snapshot recorded.
func saveJournalEntries(ctx context.Context, q *dbmodels.Queries, entries []*domain.LedgerEntry) error {
	if len(entries) == 0 {
		return errors.New("postFn returned no ledger entries")
	}

	params := make([]dbmodels.InsertLedgerEntriesParams, 0, len(entries))
	for _, e := range entries {
		if e == nil {
			return errors.New("postFn returned a nil ledger entry")
		}
		if !e.HasFundSourceSnapshot() {
			return fmt.Errorf("ledger entry %s has no fund source snapshot", e.UUID().String())
		}

		params = append(params, ledgerEntryToInsertParams(e))
	}

	_, err := q.InsertLedgerEntries(ctx, params)

	return err
}

func updateFundSourceBalances(
	ctx context.Context,
	q *dbmodels.Queries,
	fundSources map[domain.FundSourceUUID]*domain.FundSource,
) error {
	balances := make([]dbmodels.UpdateFundSourceBalanceParams, 0, len(fundSources))
	for _, fs := range fundSources {
		balances = append(balances, dbmodels.UpdateFundSourceBalanceParams{Balance: fs.Balance(), Uuid: fs.UUID()})
	}

	var batchErr error
	q.UpdateFundSourceBalance(ctx, balances).Exec(func(_ int, err error) {
		batchErr = errors.Join(batchErr, err)
	})

	return batchErr
}

func validateFundSourceUUIDs(uuids []domain.FundSourceUUID) error {
	if len(uuids) == 0 {
		return common.NewInvalidInputError("fund-sources-required", "at least one fund source is required")
	}

	seen := make(map[domain.FundSourceUUID]struct{}, len(uuids))
	for _, id := range uuids {
		if id.IsZero() {
			return common.NewInvalidInputError("fund-source-required", "fund source is required")
		}
		if _, dup := seen[id]; dup {
			return common.NewInvalidInputError("duplicate-fund-source", "duplicate fund source id %s", id.String())
		}

		seen[id] = struct{}{}
	}

	return nil
}

// TODO: in a serializable tx, lock the entry row (FOR UPDATE), call voidFn,
// insert the reversal entry, mark the original voided and update the fund
// source balance.
func (r *LedgerPeriodRepo) VoidJournalEntry(
	ctx context.Context,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
	ledgerEntryUUID domain.LedgerEntryUUID,
	voidFn func(period *domain.LedgerPeriod, entry *domain.LedgerEntry, fundSource *domain.FundSource) (*domain.LedgerEntry, error),
) error {
	return errNotImplemented
}

// TODO: lock the period row (FOR UPDATE), call Close, save.
func (r *LedgerPeriodRepo) CloseLedgerPeriod(
	ctx context.Context,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
) error {
	return errNotImplemented
}

// TODO: lock the period row (FOR UPDATE), call updateFn, save.
func (r *LedgerPeriodRepo) ReopenLedgerPeriod(
	ctx context.Context,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
	updateFn func(period *domain.LedgerPeriod) error,
) error {
	return errNotImplemented
}

// TODO: lock the period row (FOR UPDATE), call updateFn, save.
func (r *LedgerPeriodRepo) ReconcileLedgerPeriod(
	ctx context.Context,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
	updateFn func(period *domain.LedgerPeriod) error,
) error {
	return errNotImplemented
}
