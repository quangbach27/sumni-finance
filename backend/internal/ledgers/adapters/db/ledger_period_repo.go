package db

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	common "github.com/quangbach27/golang-common"
	commonDb "github.com/quangbach27/golang-common/db"
	"github.com/shopspring/decimal"

	"backend/internal/ledgers/adapters/db/dbmodels"
	"backend/internal/ledgers/apps/models"
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

		if err := validateEntryCategories(ctx, q, entries); err != nil {
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

// validateEntryCategories fails unless every category (or sub-category) used by
// the entries exists. Each failure carries the entry index.
func validateEntryCategories(
	ctx context.Context,
	q *dbmodels.Queries,
	entries []*domain.LedgerEntry,
) error {
	var uuids []common.UUID
	for _, e := range entries {
		if e != nil && e.CategoryUUID() != nil {
			uuids = append(uuids, e.CategoryUUID().UUID)
		}
	}
	if len(uuids) == 0 {
		return nil
	}

	found, err := q.ListExistingCategoryUUIDs(ctx, uuids)
	if err != nil {
		return err
	}

	existing := make(map[models.CategoryUUID]struct{}, len(found))
	for _, id := range found {
		existing[id] = struct{}{}
	}

	var details []common.ErrorDetails
	for i, e := range entries {
		if e == nil || e.CategoryUUID() == nil {
			continue
		}
		if _, ok := existing[*e.CategoryUUID()]; !ok {
			details = append(details, common.ErrorDetails{
				EntityType: "ledger-entry",
				EntityID:   strconv.Itoa(i),
				ErrorSlug:  "category-not-found",
				Message:    "category was not found",
			})
		}
	}
	if len(details) > 0 {
		return common.NewInvalidInputError("category-not-found", "one or more categories were not found").WithDetails(details)
	}

	return nil
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

// closeFundSourceStatements sets the closing balance of every statement of the
// period to the current balance of its fund source.
func closeFundSourceStatements(
	ctx context.Context,
	q *dbmodels.Queries,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
) error {
	rows, err := q.ListFundSourceStatementsByPeriod(ctx, ledgerPeriodUUID)
	if err != nil {
		return err
	}

	statements := make([]*domain.FundSourceStatement, 0, len(rows))
	fundSourceUUIDs := make([]domain.FundSourceUUID, 0, len(rows))
	for _, row := range rows {
		statements = append(statements, fundSourceStatementToDomain(row))
		fundSourceUUIDs = append(fundSourceUUIDs, row.FundSourceUuid)
	}

	fundSources, err := listFundSourcesInPeriod(ctx, q, ledgerPeriodUUID, fundSourceUUIDs)
	if err != nil {
		return err
	}

	params := make([]dbmodels.UpdateFundSourceStatementParams, 0, len(statements))
	for _, st := range statements {
		fs, ok := fundSources[st.FundSourceUUID()]
		if !ok {
			return fmt.Errorf("fund source %s of statement %s was not loaded", st.FundSourceUUID().String(), st.UUID().String())
		}

		if err := st.Close(fs.Balance()); err != nil {
			return err
		}

		params = append(params, dbmodels.UpdateFundSourceStatementParams{
			ClosingBalance: st.ClosingBalance(),
			Uuid:           st.UUID(),
		})
	}

	return updateFundSourceStatements(ctx, q, params)
}

// updateFundSourceStatements runs the statement updates as one batch and
// returns all failures joined.
func updateFundSourceStatements(
	ctx context.Context,
	q *dbmodels.Queries,
	params []dbmodels.UpdateFundSourceStatementParams,
) error {
	var batchErr error
	q.UpdateFundSourceStatement(ctx, params).Exec(func(_ int, err error) {
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

func (r *LedgerPeriodRepo) CloseLedgerPeriod(
	ctx context.Context,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
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

		if err := period.Close(); err != nil {
			return err
		}

		if err := closeFundSourceStatements(ctx, q, ledgerPeriodUUID); err != nil {
			return err
		}

		return q.UpdateLedgerPeriod(ctx, dbmodels.UpdateLedgerPeriodParams{
			Status: period.Status(),
			Uuid:   period.UUID(),
		})
	})
	if err != nil {
		var cerr common.Error
		if errors.As(err, &cerr) {
			return err
		}

		return fmt.Errorf("close ledger period: %w", err)
	}

	return nil
}

func (r *LedgerPeriodRepo) ReconcileFundSourceStatements(
	ctx context.Context,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
	reconciledBy string,
	balances []domain.StatementActualBalance,
) error {
	if ledgerPeriodUUID.IsZero() {
		return common.NewInvalidInputError("ledger-period-required", "ledger period is required")
	}

	statementUUIDs := make([]domain.FundSourceStatementUUID, 0, len(balances))
	for _, b := range balances {
		statementUUIDs = append(statementUUIDs, b.StatementUUID)
	}
	if err := validateStatementUUIDs(statementUUIDs); err != nil {
		return err
	}

	err := commonDb.UpdateInSerializableTx(ctx, r.db, func(ctx context.Context, tx pgx.Tx) error {
		q := dbmodels.New(tx)

		period, err := getLedgerPeriodByUUID(ctx, q, ledgerPeriodUUID)
		if err != nil {
			return err
		}
		if !period.IsClosed() {
			return common.NewConflictError("period-not-closed", "ledger period %s is not closed", ledgerPeriodUUID.String())
		}

		uuids := make([]common.UUID, 0, len(statementUUIDs))
		for _, id := range statementUUIDs {
			uuids = append(uuids, id.UUID)
		}

		rows, err := q.ListFundSourceStatementsByUUIDsInPeriod(ctx, dbmodels.ListFundSourceStatementsByUUIDsInPeriodParams{
			LedgerPeriodUuid: ledgerPeriodUUID,
			Uuids:            uuids,
		})
		if err != nil {
			return err
		}
		if len(rows) != len(uuids) {
			return common.NewNotFoundError("fund-source-statement-not-found", "one or more fund source statements were not found in the ledger period")
		}

		statements := make(map[domain.FundSourceStatementUUID]*domain.FundSourceStatement, len(rows))
		for _, row := range rows {
			st := fundSourceStatementToDomain(row)
			statements[st.UUID()] = st
		}

		if err := reconcileStatements(statements, balances, reconciledBy); err != nil {
			return err
		}

		params := make([]dbmodels.UpdateFundSourceStatementParams, 0, len(statements))
		for _, st := range statements {
			params = append(params, dbmodels.UpdateFundSourceStatementParams{
				ActualBalance: st.ActualBalance(),
				ReconciledBy:  st.ReconciledBy(),
				ReconciledAt:  st.ReconciledAt(),
				Uuid:          st.UUID(),
			})
		}

		return updateFundSourceStatements(ctx, q, params)
	})
	if err != nil {
		var cerr common.Error
		if errors.As(err, &cerr) {
			return err
		}

		return fmt.Errorf("reconcile fund source statements: %w", err)
	}

	return nil
}

// reconcileStatements reconciles each statement with its actual balance, in
// request order. Failures of all statements are returned together, each detail
// tagged with the statement UUID.
func reconcileStatements(
	statements map[domain.FundSourceStatementUUID]*domain.FundSourceStatement,
	balances []domain.StatementActualBalance,
	reconciledBy string,
) error {
	var details []common.ErrorDetails

	for _, b := range balances {
		st, ok := statements[b.StatementUUID]
		if !ok {
			return common.NewNotFoundError("fund-source-statement-not-found", "fund source statement %s was not found", b.StatementUUID.String())
		}

		err := st.Reconcile(b.ActualBalance, reconciledBy)
		if err == nil {
			continue
		}

		var cerr common.Error
		if !errors.As(err, &cerr) {
			return err
		}

		details = append(details, common.ErrorDetails{
			EntityType: "FundSourceStatement",
			EntityID:   b.StatementUUID.String(),
			ErrorSlug:  cerr.ErrorSlug,
			Message:    cerr.PublicError,
		})
	}

	if len(details) > 0 {
		return common.NewInvalidInputError("invalid-statement-reconciliation", "fund source statements could not be reconciled").WithDetails(details)
	}

	return nil
}

func validateStatementUUIDs(uuids []domain.FundSourceStatementUUID) error {
	if len(uuids) == 0 {
		return common.NewInvalidInputError("statements-required", "at least one fund source statement is required")
	}

	seen := make(map[domain.FundSourceStatementUUID]struct{}, len(uuids))
	for _, id := range uuids {
		if id.IsZero() {
			return common.NewInvalidInputError("statement-required", "fund source statement is required")
		}
		if _, dup := seen[id]; dup {
			return common.NewInvalidInputError("duplicate-statement", "duplicate fund source statement id %s", id.String())
		}

		seen[id] = struct{}{}
	}

	return nil
}

// ReopenLedgerPeriod reopens a closed period and clears the closing balance of
// its statements. It fails with a conflict when any statement is reconciled.
func (r *LedgerPeriodRepo) ReopenLedgerPeriod(
	ctx context.Context,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
	reason string,
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

		if err := period.Reopen(reason); err != nil {
			return err
		}

		rows, err := q.ListFundSourceStatementsByPeriod(ctx, ledgerPeriodUUID)
		if err != nil {
			return err
		}

		for _, row := range rows {
			if fundSourceStatementToDomain(row).IsReconciled() {
				return common.NewConflictError(
					"fund-source-statement-reconciled",
					"fund source statement %s is already reconciled", row.Uuid.String(),
				)
			}
		}

		if err := q.ClearFundSourceStatementClosingBalances(ctx, ledgerPeriodUUID); err != nil {
			return err
		}

		return q.UpdateLedgerPeriod(ctx, dbmodels.UpdateLedgerPeriodParams{
			Status:       period.Status(),
			ReopenReason: period.ReopenReason(),
			ReopenedAt:   period.ReopenedAt(),
			Uuid:         period.UUID(),
		})
	})
	if err != nil {
		var cerr common.Error
		if errors.As(err, &cerr) {
			return err
		}

		return fmt.Errorf("reopen ledger period: %w", err)
	}

	return nil
}

// GenerateLedgerPeriodReport generates the period's report and links it to the period.
// A period gets one report: when it already has one, that report UUID is returned.
// TODO: the report is an empty placeholder row until real generation is implemented.
func (r *LedgerPeriodRepo) GenerateLedgerPeriodReport(
	ctx context.Context,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
) (models.ReportUUID, error) {
	if ledgerPeriodUUID.IsZero() {
		return models.ReportUUID{}, common.NewInvalidInputError("ledger-period-required", "ledger period is required")
	}

	var reportUUID models.ReportUUID

	err := commonDb.UpdateInSerializableTx(ctx, r.db, func(ctx context.Context, tx pgx.Tx) error {
		q := dbmodels.New(tx)

		existing, err := q.GetLedgerPeriodReportUUID(ctx, ledgerPeriodUUID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return common.NewNotFoundError("ledger-period-not-found", "ledger period %s was not found", ledgerPeriodUUID.String())
			}

			return err
		}

		if existing != nil {
			reportUUID = *existing

			return nil
		}

		reportUUID = models.ReportUUID{UUID: common.NewUUIDv7()}

		if err := q.CreateLedgerPeriodReport(ctx, reportUUID); err != nil {
			return err
		}

		return q.UpdateLedgerPeriodReportUUID(ctx, dbmodels.UpdateLedgerPeriodReportUUIDParams{
			ReportUuid: &reportUUID,
			Uuid:       ledgerPeriodUUID,
		})
	})
	if err != nil {
		var cerr common.Error
		if errors.As(err, &cerr) {
			return models.ReportUUID{}, err
		}

		return models.ReportUUID{}, fmt.Errorf("generate ledger period report: %w", err)
	}

	return reportUUID, nil
}

func (r *LedgerPeriodRepo) ReconcileLedgerPeriod(
	ctx context.Context,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
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
		if !period.IsClosed() {
			return common.NewConflictError("period-not-closed", "ledger period %s is not closed", ledgerPeriodUUID.String())
		}

		rows, err := q.ListFundSourceStatementsByPeriod(ctx, ledgerPeriodUUID)
		if err != nil {
			return err
		}
		if len(rows) == 0 {
			return common.NewConflictError("statements-not-reconciled", "ledger period %s has no fund source statements", ledgerPeriodUUID.String())
		}

		var details []common.ErrorDetails
		total := decimal.Zero

		for _, row := range rows {
			st := fundSourceStatementToDomain(row)
			if !st.IsReconciled() || st.ClosingBalance() == nil {
				details = append(details, common.ErrorDetails{
					EntityType: "FundSourceStatement",
					EntityID:   st.UUID().String(),
					ErrorSlug:  "fund-source-statement-not-reconciled",
					Message:    "fund source statement is not reconciled",
				})

				continue
			}

			total = total.Add(*st.ClosingBalance())
		}

		if len(details) > 0 {
			return common.NewConflictError("statements-not-reconciled", "all fund source statements must be reconciled").WithDetails(details)
		}

		if err := period.Reconcile(total); err != nil {
			return err
		}

		return q.UpdateLedgerPeriod(ctx, dbmodels.UpdateLedgerPeriodParams{
			Status:         period.Status(),
			ClosingBalance: period.ClosingBalance(),
			ReconciledAt:   period.ReconciledAt(),
			Uuid:           period.UUID(),
		})
	})
	if err != nil {
		var cerr common.Error
		if errors.As(err, &cerr) {
			return err
		}

		return fmt.Errorf("reconcile ledger period: %w", err)
	}

	return nil
}
