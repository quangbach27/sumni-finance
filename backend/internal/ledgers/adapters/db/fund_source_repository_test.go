//go:build integration

package db_test

import (
	"context"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/adapters/bankverifier"
	ledgerdb "backend/internal/ledgers/adapters/db"
	"backend/internal/ledgers/adapters/db/dbmodels"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

func TestFundSourceRepository_CreateFundSource(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo, err := ledgerdb.NewFundSourceRepository(pgxDb)
	require.NoError(t, err)

	factory, err := domain.NewFundSourceFactory(bankverifier.NewBankAccountVerifierStub())
	require.NoError(t, err)

	vnd := common.MustEnum[shared.Currency]("VND")

	t.Run("bank", func(t *testing.T) {
		t.Parallel()

		details, err := factory.CreateBankDetails(ctx, "VCB", "970436", "Vietcombank", "An", "123456")
		require.NoError(t, err)
		fs, err := factory.CreateFundSource("An - VCB", decimal.NewFromInt(15_000_000), vnd, details)
		require.NoError(t, err)

		require.NoError(t, repo.CreateFundSource(ctx, fs))

		want := dbmodels.LedgersFundSource{
			Uuid:          fs.UUID(),
			Name:          "An - VCB",
			Type:          domain.FundSourceTypeBank,
			Balance:       decimal.NewFromInt(15_000_000),
			Currency:      "VND",
			OwnerName:     "An",
			BankCode:      ptr("VCB"),
			BankBin:       ptr("970436"),
			BankShortName: ptr("Vietcombank"),
			AccountNumber: ptr("123456"),
		}
		assertFundSourceRow(t, ctx, fs.UUID(), want)
	})

	t.Run("cash", func(t *testing.T) {
		t.Parallel()

		details, err := factory.CreateCashDetails("An")
		require.NoError(t, err)
		fs, err := factory.CreateFundSource("An - Cash", decimal.Zero, vnd, details)
		require.NoError(t, err)

		require.NoError(t, repo.CreateFundSource(ctx, fs))

		want := dbmodels.LedgersFundSource{
			Uuid:      fs.UUID(),
			Name:      "An - Cash",
			Type:      domain.FundSourceTypeCash,
			Balance:   decimal.Zero,
			Currency:  "VND",
			OwnerName: "An",
		}
		assertFundSourceRow(t, ctx, fs.UUID(), want)
	})
}

func ptr[T any](v T) *T { return &v }

// assertFundSourceRow compares the stored row with want; created_at is set by the database, so it is ignored.
func assertFundSourceRow(t *testing.T, ctx context.Context, id domain.FundSourceUUID, want dbmodels.LedgersFundSource) {
	t.Helper()

	got, err := dbmodels.New(pgxDb).GetFundSourceByID(ctx, id)
	require.NoError(t, err)

	if diff := cmp.Diff(want, got, cmpopts.IgnoreFields(dbmodels.LedgersFundSource{}, "CreatedAt")); diff != "" {
		t.Errorf("row mismatch (-want +got):\n%s", diff)
	}
}

func TestNewFundSourceRepository_NilDB(t *testing.T) {
	t.Parallel()

	repo, err := ledgerdb.NewFundSourceRepository(nil)
	assert.Nil(t, repo)
	assert.Error(t, err)
}
