//go:build integration

package db_test

import (
	"context"
	"testing"

	"github.com/google/go-cmp/cmp"
	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/adapters/bankverifier"
	ledgerdb "backend/internal/ledgers/adapters/db"
	"backend/internal/ledgers/apps/queries"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

func TestFundSourceReadModel_ListFundSources(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo, err := ledgerdb.NewFundSourceRepository(pgxDb)
	require.NoError(t, err)
	readModel, err := ledgerdb.NewFundSourceReadModel(pgxDb)
	require.NoError(t, err)

	factory, err := domain.NewFundSourceFactory(bankverifier.NewBankAccountVerifierStub())
	require.NoError(t, err)

	vnd := common.MustEnum[shared.Currency]("VND")

	bankDetails, err := factory.CreateBankDetails(ctx, "VCB", "970436", "Vietcombank", "An", "123456")
	require.NoError(t, err)
	bankFs, err := factory.CreateFundSource("An - VCB (list)", decimal.NewFromInt(15_000_000), vnd, bankDetails)
	require.NoError(t, err)
	require.NoError(t, repo.CreateFundSource(ctx, bankFs))

	cashDetails, err := factory.CreateCashDetails("Binh")
	require.NoError(t, err)
	cashFs, err := factory.CreateFundSource("Binh - Cash (list)", decimal.Zero, vnd, cashDetails)
	require.NoError(t, err)
	require.NoError(t, repo.CreateFundSource(ctx, cashFs))

	got, err := readModel.ListFundSources(ctx)
	require.NoError(t, err)

	byUUID := make(map[string]queries.FundSource, len(got))
	for _, fs := range got {
		byUUID[fs.UUID] = fs
	}

	t.Run("bank", func(t *testing.T) {
		got, ok := byUUID[bankFs.UUID().String()]
		require.True(t, ok, "bank fund source not listed")

		want := queries.FundSource{
			UUID:     bankFs.UUID().String(),
			Name:     "An - VCB (list)",
			Type:     "bank",
			Balance:  decimal.NewFromInt(15_000_000),
			Currency: "VND",
			Details: queries.FundSourceDetails{
				OwnerName: "An",
				Bank: &queries.BankDetails{
					BankCode:      "VCB",
					BankBin:       "970436",
					BankShortName: "Vietcombank",
					AccountNumber: "123456",
				},
			},
		}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("fund source mismatch (-want +got):\n%s", diff)
		}
	})

	t.Run("cash", func(t *testing.T) {
		got, ok := byUUID[cashFs.UUID().String()]
		require.True(t, ok, "cash fund source not listed")

		want := queries.FundSource{
			UUID:     cashFs.UUID().String(),
			Name:     "Binh - Cash (list)",
			Type:     "cash",
			Balance:  decimal.Zero,
			Currency: "VND",
			Details:  queries.FundSourceDetails{OwnerName: "Binh"},
		}
		if diff := cmp.Diff(want, got); diff != "" {
			t.Errorf("fund source mismatch (-want +got):\n%s", diff)
		}
	})
}

func TestNewFundSourceReadModel_NilDB(t *testing.T) {
	t.Parallel()

	readModel, err := ledgerdb.NewFundSourceReadModel(nil)
	assert.Nil(t, readModel)
	assert.Error(t, err)
}
