//go:build integration

package db_test

import (
	"context"
	"testing"
	"time"

	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/adapters/bankverifier"
	ledgerdb "backend/internal/ledgers/adapters/db"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

// The "one unlocked period at a time" rule is global, so these tests are not
// parallel and clear the period tables before each case.
func resetPeriods(t *testing.T, ctx context.Context) {
	t.Helper()

	_, err := pgxDb.Exec(ctx, "DELETE FROM ledgers.ledger_entries")
	require.NoError(t, err)
	_, err = pgxDb.Exec(ctx, "DELETE FROM ledgers.fund_source_statements")
	require.NoError(t, err)
	_, err = pgxDb.Exec(ctx, "DELETE FROM ledgers.ledger_periods")
	require.NoError(t, err)
}

func createCashFundSource(t *testing.T, ctx context.Context, balance int64) *domain.FundSource {
	t.Helper()

	repo, err := ledgerdb.NewFundSourceRepository(pgxDb)
	require.NoError(t, err)
	factory, err := domain.NewFundSourceFactory(bankverifier.NewBankAccountVerifierStub())
	require.NoError(t, err)

	details, err := factory.CreateCashDetails("An")
	require.NoError(t, err)
	fs, err := factory.CreateFundSource("cash", decimal.NewFromInt(balance), shared.CurrencyVND, details)
	require.NoError(t, err)
	require.NoError(t, repo.CreateFundSource(ctx, testOrgID, fs))

	return fs
}

func sumBalances(fundSources []*domain.FundSource) decimal.Decimal {
	total := decimal.Zero
	for _, fs := range fundSources {
		total = total.Add(fs.Balance())
	}

	return total
}

func TestLedgerPeriodRepo_OpenLedgerPeriod(t *testing.T) {
	ctx := context.Background()
	repo, err := ledgerdb.NewLedgerPeriodRepository(pgxDb)
	require.NoError(t, err)

	open := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)
	createFn := func(out **domain.LedgerPeriod) func([]*domain.FundSource) (*domain.LedgerPeriod, error) {
		return func(fundSources []*domain.FundSource) (*domain.LedgerPeriod, error) {
			p, err := domain.NewLedgerPeriod("Nov 2026", sumBalances(fundSources), open, open.AddDate(0, 1, -1))
			*out = p

			return p, err
		}
	}

	t.Run("stores period and period fund sources", func(t *testing.T) {
		resetPeriods(t, ctx)
		fs1 := createCashFundSource(t, ctx, 1_000)
		fs2 := createCashFundSource(t, ctx, 2_500)

		var period *domain.LedgerPeriod
		require.NoError(t, repo.OpenLedgerPeriod(ctx, testOrgID, []domain.FundSourceUUID{fs1.UUID(), fs2.UUID()}, createFn(&period)))

		var openingBalance decimal.Decimal
		var status string
		require.NoError(t, pgxDb.QueryRow(ctx,
			"SELECT opening_balance, status FROM ledgers.ledger_periods WHERE uuid = $1", period.UUID(),
		).Scan(&openingBalance, &status))
		assert.True(t, openingBalance.Equal(decimal.NewFromInt(3_500)))
		assert.Equal(t, "opened", status)

		rows, err := pgxDb.Query(ctx,
			"SELECT fund_source_uuid, opening_balance FROM ledgers.fund_source_statements WHERE ledger_period_uuid = $1", period.UUID())
		require.NoError(t, err)
		defer rows.Close()

		got := map[domain.FundSourceUUID]decimal.Decimal{}
		for rows.Next() {
			var id domain.FundSourceUUID
			var bal decimal.Decimal
			require.NoError(t, rows.Scan(&id, &bal))
			got[id] = bal
		}
		require.NoError(t, rows.Err())
		require.Len(t, got, 2)
		assert.True(t, got[fs1.UUID()].Equal(decimal.NewFromInt(1_000)))
		assert.True(t, got[fs2.UUID()].Equal(decimal.NewFromInt(2_500)))
	})

	t.Run("conflicts while an unlocked period exists, succeeds once reconciled", func(t *testing.T) {
		resetPeriods(t, ctx)
		fs := createCashFundSource(t, ctx, 10)
		ids := []domain.FundSourceUUID{fs.UUID()}

		var first *domain.LedgerPeriod
		require.NoError(t, repo.OpenLedgerPeriod(ctx, testOrgID, ids, createFn(&first)))

		var second *domain.LedgerPeriod
		err := repo.OpenLedgerPeriod(ctx, testOrgID, ids, createFn(&second))
		var cerr common.Error
		require.ErrorAs(t, err, &cerr)
		assert.Equal(t, "unlocked-period-exists", cerr.ErrorSlug)

		_, err = pgxDb.Exec(ctx,
			"UPDATE ledgers.ledger_periods SET status = 'reconciled', closing_balance = 10, reconciled_at = now() WHERE uuid = $1",
			first.UUID())
		require.NoError(t, err)

		require.NoError(t, repo.OpenLedgerPeriod(ctx, testOrgID, ids, createFn(&second)))
	})

	t.Run("invalid fund source lists", func(t *testing.T) {
		resetPeriods(t, ctx)
		var p *domain.LedgerPeriod

		require.Error(t, repo.OpenLedgerPeriod(ctx, testOrgID, nil, createFn(&p)))

		fs := createCashFundSource(t, ctx, 1)
		require.Error(t, repo.OpenLedgerPeriod(ctx, testOrgID, []domain.FundSourceUUID{fs.UUID(), fs.UUID()}, createFn(&p)))

		missing := domain.FundSourceUUID{UUID: common.NewUUIDv7()}
		err := repo.OpenLedgerPeriod(ctx, testOrgID, []domain.FundSourceUUID{fs.UUID(), missing}, createFn(&p))
		var cerr common.Error
		require.ErrorAs(t, err, &cerr)
		assert.Equal(t, "fund-source-not-found", cerr.ErrorSlug)
	})
}

func openPeriodFor(t *testing.T, ctx context.Context, fundSources ...*domain.FundSource) *domain.LedgerPeriod {
	t.Helper()

	repo, err := ledgerdb.NewLedgerPeriodRepository(pgxDb)
	require.NoError(t, err)

	uuids := make([]domain.FundSourceUUID, 0, len(fundSources))
	for _, fs := range fundSources {
		uuids = append(uuids, fs.UUID())
	}

	open := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)

	var period *domain.LedgerPeriod
	require.NoError(t, repo.OpenLedgerPeriod(ctx, testOrgID, uuids, func(fss []*domain.FundSource) (*domain.LedgerPeriod, error) {
		p, err := domain.NewLedgerPeriod("Nov", sumBalances(fss), open, open.AddDate(0, 1, -1))
		period = p

		return p, err
	}))

	return period
}

// postFn builds one entry per (fund source, direction, amount) and applies it, like the command handler.
type entrySpec struct {
	fs        *domain.FundSource
	direction shared.Direction
	amount    int64
}

func postFnFor(t *testing.T, specs []entrySpec) func(*domain.LedgerPeriod, map[domain.FundSourceUUID]*domain.FundSource) ([]*domain.LedgerEntry, error) {
	t.Helper()

	return func(period *domain.LedgerPeriod, fss map[domain.FundSourceUUID]*domain.FundSource) ([]*domain.LedgerEntry, error) {
		entries := make([]*domain.LedgerEntry, 0, len(specs))
		for _, s := range specs {
			e, err := domain.NewLedgerEntry(period.UUID(), s.fs.UUID(), decimal.NewFromInt(s.amount), s.direction,
				"entry", time.Date(2026, 11, 2, 0, 0, 0, 0, time.UTC), nil)
			if err != nil {
				return nil, err
			}

			fs := fss[s.fs.UUID()]

			var snap domain.FundSourceSnapshot
			if s.direction.Equal(shared.DirectionInflow.Enum) {
				snap, err = fs.TopUp(e.Amount())
			} else {
				snap, err = fs.Withdraw(e.Amount())
			}
			if err != nil {
				return nil, err
			}
			if err := e.RecordFundSourceSnapshot(snap); err != nil {
				return nil, err
			}

			entries = append(entries, e)
		}

		return entries, nil
	}
}

func fsBalance(t *testing.T, ctx context.Context, fs *domain.FundSource) decimal.Decimal {
	t.Helper()

	var b decimal.Decimal
	require.NoError(t, pgxDb.QueryRow(ctx, "SELECT balance FROM ledgers.fund_sources WHERE uuid = $1", fs.UUID()).Scan(&b))

	return b
}

func TestLedgerPeriodRepo_PostJournalEntries(t *testing.T) {
	ctx := context.Background()
	repo, err := ledgerdb.NewLedgerPeriodRepository(pgxDb)
	require.NoError(t, err)

	t.Run("stores the batch with a chained balance snapshot and updates balances", func(t *testing.T) {
		resetPeriods(t, ctx)
		fs1 := createCashFundSource(t, ctx, 1_000)
		fs2 := createCashFundSource(t, ctx, 500)
		period := openPeriodFor(t, ctx, fs1, fs2)

		specs := []entrySpec{
			{fs1, shared.DirectionOutflow, 300},
			{fs1, shared.DirectionInflow, 100},
			{fs2, shared.DirectionInflow, 50},
		}
		require.NoError(t, repo.PostJournalEntries(ctx, testOrgID, period.UUID(),
			[]domain.FundSourceUUID{fs1.UUID(), fs2.UUID()}, postFnFor(t, specs)))

		assert.True(t, fsBalance(t, ctx, fs1).Equal(decimal.NewFromInt(800)))
		assert.True(t, fsBalance(t, ctx, fs2).Equal(decimal.NewFromInt(550)))

		rows, err := pgxDb.Query(ctx,
			"SELECT fs_balance_before, fs_balance_after FROM ledgers.ledger_entries WHERE fund_source_uuid = $1 ORDER BY fs_balance_before DESC", fs1.UUID())
		require.NoError(t, err)
		defer rows.Close()

		type pair struct{ before, after decimal.Decimal }
		var got []pair
		for rows.Next() {
			var p pair
			require.NoError(t, rows.Scan(&p.before, &p.after))
			got = append(got, p)
		}
		require.Len(t, got, 2)
		// 1000 -> 700 (outflow 300), 700 -> 800 (inflow 100)
		assert.True(t, got[0].before.Equal(decimal.NewFromInt(1000)) && got[0].after.Equal(decimal.NewFromInt(700)))
		assert.True(t, got[1].before.Equal(decimal.NewFromInt(700)) && got[1].after.Equal(decimal.NewFromInt(800)))
	})

	t.Run("insufficient balance rolls back the whole batch", func(t *testing.T) {
		resetPeriods(t, ctx)
		fs1 := createCashFundSource(t, ctx, 1_000)
		fs2 := createCashFundSource(t, ctx, 10)
		period := openPeriodFor(t, ctx, fs1, fs2)

		specs := []entrySpec{
			{fs1, shared.DirectionOutflow, 100},
			{fs2, shared.DirectionOutflow, 999},
		}
		err := repo.PostJournalEntries(ctx, testOrgID, period.UUID(),
			[]domain.FundSourceUUID{fs1.UUID(), fs2.UUID()}, postFnFor(t, specs))
		require.Error(t, err)
		assert.Contains(t, err.Error(), "insufficient-balance")

		assert.True(t, fsBalance(t, ctx, fs1).Equal(decimal.NewFromInt(1000)))

		var n int
		require.NoError(t, pgxDb.QueryRow(ctx, "SELECT count(*) FROM ledgers.ledger_entries WHERE ledger_period_uuid = $1", period.UUID()).Scan(&n))
		assert.Zero(t, n)
	})

	t.Run("unknown period is not found", func(t *testing.T) {
		resetPeriods(t, ctx)
		fs := createCashFundSource(t, ctx, 100)
		openPeriodFor(t, ctx, fs)

		err := repo.PostJournalEntries(ctx, testOrgID, domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()}, []domain.FundSourceUUID{fs.UUID()},
			postFnFor(t, []entrySpec{{fs, shared.DirectionInflow, 1}}))
		require.Error(t, err)
		assert.Contains(t, err.Error(), "ledger-period-not-found")
	})

	t.Run("fund source outside the period is rejected", func(t *testing.T) {
		resetPeriods(t, ctx)
		inPeriod := createCashFundSource(t, ctx, 100)
		outside := createCashFundSource(t, ctx, 100)
		period := openPeriodFor(t, ctx, inPeriod)

		err := repo.PostJournalEntries(ctx, testOrgID, period.UUID(), []domain.FundSourceUUID{outside.UUID()},
			postFnFor(t, []entrySpec{{outside, shared.DirectionInflow, 1}}))
		require.Error(t, err)
		assert.Contains(t, err.Error(), "fund-source-not-in-period")
	})

	t.Run("invalid fund source list is rejected", func(t *testing.T) {
		resetPeriods(t, ctx)
		fs := createCashFundSource(t, ctx, 100)
		period := openPeriodFor(t, ctx, fs)
		postFn := postFnFor(t, []entrySpec{{fs, shared.DirectionInflow, 1}})

		cases := map[string]struct {
			uuids []domain.FundSourceUUID
			slug  string
		}{
			"empty":     {nil, "fund-sources-required"},
			"zero":      {[]domain.FundSourceUUID{{}}, "fund-source-required"},
			"duplicate": {[]domain.FundSourceUUID{fs.UUID(), fs.UUID()}, "duplicate-fund-source"},
		}
		for name, tc := range cases {
			t.Run(name, func(t *testing.T) {
				err := repo.PostJournalEntries(ctx, testOrgID, period.UUID(), tc.uuids, postFn)
				require.Error(t, err)
				assert.Contains(t, err.Error(), tc.slug)
			})
		}
	})

	t.Run("concurrent posts keep the balance chain consistent", func(t *testing.T) {
		resetPeriods(t, ctx)
		fs := createCashFundSource(t, ctx, 0)
		period := openPeriodFor(t, ctx, fs)

		const workers = 8
		errs := make(chan error, workers)
		for i := 0; i < workers; i++ {
			go func() {
				errs <- repo.PostJournalEntries(ctx, testOrgID, period.UUID(), []domain.FundSourceUUID{fs.UUID()},
					postFnFor(t, []entrySpec{{fs, shared.DirectionInflow, 10}}))
			}()
		}
		for i := 0; i < workers; i++ {
			require.NoError(t, <-errs)
		}

		assert.True(t, fsBalance(t, ctx, fs).Equal(decimal.NewFromInt(80)))

		var distinct int
		require.NoError(t, pgxDb.QueryRow(ctx,
			"SELECT count(DISTINCT fs_balance_before) FROM ledgers.ledger_entries WHERE fund_source_uuid = $1", fs.UUID()).Scan(&distinct))
		assert.Equal(t, workers, distinct)
	})
}

func TestLedgerPeriodRepo_CloseAndReconcile(t *testing.T) {
	ctx := context.Background()
	repo, err := ledgerdb.NewLedgerPeriodRepository(pgxDb)
	require.NoError(t, err)

	statementUUIDs := func(t *testing.T, period *domain.LedgerPeriod) []domain.FundSourceStatementUUID {
		t.Helper()

		rows, err := pgxDb.Query(ctx,
			"SELECT uuid FROM ledgers.fund_source_statements WHERE ledger_period_uuid = $1 ORDER BY uuid", period.UUID())
		require.NoError(t, err)
		defer rows.Close()

		var ids []domain.FundSourceStatementUUID
		for rows.Next() {
			var id domain.FundSourceStatementUUID
			require.NoError(t, rows.Scan(&id))
			ids = append(ids, id)
		}
		require.NoError(t, rows.Err())

		return ids
	}

	balancesFor := func(ids []domain.FundSourceStatementUUID, actual int64) []domain.StatementActualBalance {
		out := make([]domain.StatementActualBalance, 0, len(ids))
		for _, id := range ids {
			out = append(out, domain.StatementActualBalance{StatementUUID: id, ActualBalance: decimal.NewFromInt(actual)})
		}

		return out
	}

	t.Run("close stores closing balances and status", func(t *testing.T) {
		resetPeriods(t, ctx)
		fs := createCashFundSource(t, ctx, 1_000)
		period := openPeriodFor(t, ctx, fs)

		_, err := pgxDb.Exec(ctx, "UPDATE ledgers.fund_sources SET balance = 1500 WHERE uuid = $1", fs.UUID())
		require.NoError(t, err)

		require.NoError(t, repo.CloseLedgerPeriod(ctx, testOrgID, period.UUID()))

		var status string
		var closing decimal.Decimal
		require.NoError(t, pgxDb.QueryRow(ctx,
			`SELECT p.status, s.closing_balance FROM ledgers.ledger_periods p
			 JOIN ledgers.fund_source_statements s ON s.ledger_period_uuid = p.uuid WHERE p.uuid = $1`, period.UUID(),
		).Scan(&status, &closing))
		assert.Equal(t, "closed", status)
		assert.True(t, closing.Equal(decimal.NewFromInt(1_500)))

		err = repo.CloseLedgerPeriod(ctx, testOrgID, period.UUID())
		var cerr common.Error
		require.ErrorAs(t, err, &cerr)
		assert.Equal(t, "period-not-open", cerr.ErrorSlug)
	})

	t.Run("close of an unknown period is not found", func(t *testing.T) {
		resetPeriods(t, ctx)

		err := repo.CloseLedgerPeriod(ctx, testOrgID, domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()})
		var cerr common.Error
		require.ErrorAs(t, err, &cerr)
		assert.Equal(t, "ledger-period-not-found", cerr.ErrorSlug)
	})

	t.Run("reconcile stores all statements", func(t *testing.T) {
		resetPeriods(t, ctx)
		period := openPeriodFor(t, ctx, createCashFundSource(t, ctx, 1_000), createCashFundSource(t, ctx, 1_000))
		require.NoError(t, repo.CloseLedgerPeriod(ctx, testOrgID, period.UUID()))

		ids := statementUUIDs(t, period)
		require.NoError(t, repo.ReconcileFundSourceStatements(ctx, testOrgID, period.UUID(), "user-1", balancesFor(ids, 1_000)))

		var n int
		require.NoError(t, pgxDb.QueryRow(ctx,
			"SELECT count(*) FROM ledgers.fund_source_statements WHERE ledger_period_uuid = $1 AND reconciled_by = 'user-1' AND actual_balance = 1000 AND reconciled_at IS NOT NULL",
			period.UUID()).Scan(&n))
		assert.Equal(t, 2, n)
	})

	t.Run("a mismatch persists nothing and reports the statement", func(t *testing.T) {
		resetPeriods(t, ctx)
		period := openPeriodFor(t, ctx, createCashFundSource(t, ctx, 1_000), createCashFundSource(t, ctx, 1_000))
		require.NoError(t, repo.CloseLedgerPeriod(ctx, testOrgID, period.UUID()))
		ids := statementUUIDs(t, period)

		balances := balancesFor(ids, 1_000)
		balances[1].ActualBalance = decimal.NewFromInt(999)

		err := repo.ReconcileFundSourceStatements(ctx, testOrgID, period.UUID(), "user-1", balances)
		var cerr common.Error
		require.ErrorAs(t, err, &cerr)
		assert.Equal(t, "invalid-statement-reconciliation", cerr.ErrorSlug)
		require.Len(t, cerr.Details, 1)
		assert.Equal(t, "balance-mismatch", cerr.Details[0].ErrorSlug)
		assert.Equal(t, ids[1].String(), cerr.Details[0].EntityID)

		var n int
		require.NoError(t, pgxDb.QueryRow(ctx,
			"SELECT count(*) FROM ledgers.fund_source_statements WHERE ledger_period_uuid = $1 AND reconciled_at IS NOT NULL",
			period.UUID()).Scan(&n))
		assert.Zero(t, n)
	})

	t.Run("an open period conflicts", func(t *testing.T) {
		resetPeriods(t, ctx)
		period := openPeriodFor(t, ctx, createCashFundSource(t, ctx, 1_000))

		err := repo.ReconcileFundSourceStatements(ctx, testOrgID, period.UUID(), "user-1", balancesFor(statementUUIDs(t, period), 1_000))
		var cerr common.Error
		require.ErrorAs(t, err, &cerr)
		assert.Equal(t, "period-not-closed", cerr.ErrorSlug)
	})

	t.Run("unknown and duplicate statements are rejected", func(t *testing.T) {
		resetPeriods(t, ctx)
		period := openPeriodFor(t, ctx, createCashFundSource(t, ctx, 1_000))
		require.NoError(t, repo.CloseLedgerPeriod(ctx, testOrgID, period.UUID()))
		ids := statementUUIDs(t, period)

		err := repo.ReconcileFundSourceStatements(ctx, testOrgID, period.UUID(), "user-1",
			balancesFor([]domain.FundSourceStatementUUID{{UUID: common.NewUUIDv7()}}, 1_000))
		var cerr common.Error
		require.ErrorAs(t, err, &cerr)
		assert.Equal(t, "fund-source-statement-not-found", cerr.ErrorSlug)

		err = repo.ReconcileFundSourceStatements(ctx, testOrgID, period.UUID(), "user-1", balancesFor(append(ids, ids...), 1_000))
		require.ErrorAs(t, err, &cerr)
		assert.Equal(t, "duplicate-statement", cerr.ErrorSlug)

		err = repo.ReconcileFundSourceStatements(ctx, testOrgID, period.UUID(), "user-1", nil)
		require.ErrorAs(t, err, &cerr)
		assert.Equal(t, "statements-required", cerr.ErrorSlug)
	})
}

func TestLedgerPeriodRepo_ReconcileLedgerPeriod(t *testing.T) {
	ctx := context.Background()
	repo, err := ledgerdb.NewLedgerPeriodRepository(pgxDb)
	require.NoError(t, err)

	reconcileAllStatements := func(t *testing.T, period *domain.LedgerPeriod, actual int64) {
		t.Helper()

		_, err := pgxDb.Exec(ctx,
			"UPDATE ledgers.fund_source_statements SET actual_balance = $2, reconciled_by = 'user-1', reconciled_at = now() WHERE ledger_period_uuid = $1",
			period.UUID(), actual)
		require.NoError(t, err)
	}

	t.Run("stores status, closing balance and reconciled_at", func(t *testing.T) {
		resetPeriods(t, ctx)
		period := openPeriodFor(t, ctx, createCashFundSource(t, ctx, 1_000), createCashFundSource(t, ctx, 1_000))
		require.NoError(t, repo.CloseLedgerPeriod(ctx, testOrgID, period.UUID()))
		reconcileAllStatements(t, period, 1_000)

		require.NoError(t, repo.ReconcileLedgerPeriod(ctx, testOrgID, period.UUID()))

		var status string
		var closing decimal.Decimal
		var reconciledAt *time.Time
		require.NoError(t, pgxDb.QueryRow(ctx,
			"SELECT status, closing_balance, reconciled_at FROM ledgers.ledger_periods WHERE uuid = $1", period.UUID(),
		).Scan(&status, &closing, &reconciledAt))
		assert.Equal(t, "reconciled", status)
		assert.True(t, closing.Equal(decimal.NewFromInt(2_000)))
		assert.NotNil(t, reconciledAt)
	})

	t.Run("an unreconciled statement fails and the period stays closed", func(t *testing.T) {
		resetPeriods(t, ctx)
		period := openPeriodFor(t, ctx, createCashFundSource(t, ctx, 1_000), createCashFundSource(t, ctx, 1_000))
		require.NoError(t, repo.CloseLedgerPeriod(ctx, testOrgID, period.UUID()))

		err := repo.ReconcileLedgerPeriod(ctx, testOrgID, period.UUID())
		var cerr common.Error
		require.ErrorAs(t, err, &cerr)
		assert.Equal(t, "statements-not-reconciled", cerr.ErrorSlug)
		assert.Len(t, cerr.Details, 2)

		var status string
		require.NoError(t, pgxDb.QueryRow(ctx, "SELECT status FROM ledgers.ledger_periods WHERE uuid = $1", period.UUID()).Scan(&status))
		assert.Equal(t, "closed", status)
	})

	t.Run("an open period conflicts", func(t *testing.T) {
		resetPeriods(t, ctx)
		period := openPeriodFor(t, ctx, createCashFundSource(t, ctx, 1_000))

		err := repo.ReconcileLedgerPeriod(ctx, testOrgID, period.UUID())
		var cerr common.Error
		require.ErrorAs(t, err, &cerr)
		assert.Equal(t, "period-not-closed", cerr.ErrorSlug)
	})

	t.Run("unknown period is not found", func(t *testing.T) {
		resetPeriods(t, ctx)

		err := repo.ReconcileLedgerPeriod(ctx, testOrgID, domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()})
		var cerr common.Error
		require.ErrorAs(t, err, &cerr)
		assert.Equal(t, "ledger-period-not-found", cerr.ErrorSlug)
	})
}
