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

	_, err := pgxDb.Exec(ctx, "DELETE FROM ledgers.fund_source_statements")
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
	require.NoError(t, repo.CreateFundSource(ctx, fs))

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
		require.NoError(t, repo.OpenLedgerPeriod(ctx, []domain.FundSourceUUID{fs1.UUID(), fs2.UUID()}, createFn(&period)))

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
		require.NoError(t, repo.OpenLedgerPeriod(ctx, ids, createFn(&first)))

		var second *domain.LedgerPeriod
		err := repo.OpenLedgerPeriod(ctx, ids, createFn(&second))
		var cerr common.Error
		require.ErrorAs(t, err, &cerr)
		assert.Equal(t, "unlocked-period-exists", cerr.ErrorSlug)

		_, err = pgxDb.Exec(ctx,
			"UPDATE ledgers.ledger_periods SET status = 'reconciled', closing_balance = 10, reconciled_at = now() WHERE uuid = $1",
			first.UUID())
		require.NoError(t, err)

		require.NoError(t, repo.OpenLedgerPeriod(ctx, ids, createFn(&second)))
	})

	t.Run("invalid fund source lists", func(t *testing.T) {
		resetPeriods(t, ctx)
		var p *domain.LedgerPeriod

		require.Error(t, repo.OpenLedgerPeriod(ctx, nil, createFn(&p)))

		fs := createCashFundSource(t, ctx, 1)
		require.Error(t, repo.OpenLedgerPeriod(ctx, []domain.FundSourceUUID{fs.UUID(), fs.UUID()}, createFn(&p)))

		missing := domain.FundSourceUUID{UUID: common.NewUUIDv7()}
		err := repo.OpenLedgerPeriod(ctx, []domain.FundSourceUUID{fs.UUID(), missing}, createFn(&p))
		var cerr common.Error
		require.ErrorAs(t, err, &cerr)
		assert.Equal(t, "fund-source-not-found", cerr.ErrorSlug)
	})
}
