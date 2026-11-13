//go:build integration

package db_test

import (
	"context"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/adapters/bankverifier"
	ledgerdb "backend/internal/ledgers/adapters/db"
	"backend/internal/ledgers/adapters/db/dbmodels"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
	"backend/internal/utils"
)

func TestFundSourceRepository_CreateFundSource(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo, err := ledgerdb.NewFundSourceRepository(pgxDb)
	require.NoError(t, err)

	factory, err := domain.NewFundSourceFactory(bankverifier.NewBankAccountVerifierStub())
	require.NoError(t, err)

	vnd := shared.CurrencyVND

	t.Run("bank", func(t *testing.T) {
		t.Parallel()

		details, err := factory.CreateBankDetails(ctx, "VCB", 970436, "Vietcombank", "An", "123456")
		require.NoError(t, err)
		fs, err := factory.CreateFundSource("An - VCB", decimal.NewFromInt(15_000_000), vnd, details)
		require.NoError(t, err)

		require.NoError(t, repo.CreateFundSource(ctx, testOrgID, fs))

		want := dbmodels.LedgersFundSource{
			OrgID:         testOrgID,
			Uuid:          fs.UUID(),
			Name:          "An - VCB",
			Type:          domain.FundSourceTypeBank,
			Balance:       decimal.NewFromInt(15_000_000),
			Currency:      "VND",
			OwnerName:     "An",
			BankCode:      utils.Ptr("VCB"),
			BankBin:       utils.Ptr(int32(970436)),
			BankShortName: utils.Ptr("Vietcombank"),
			AccountNumber: utils.Ptr("123456"),
		}
		assertFundSourceRow(t, ctx, fs.UUID(), want)
	})

	t.Run("cash", func(t *testing.T) {
		t.Parallel()

		details, err := factory.CreateCashDetails("An")
		require.NoError(t, err)
		fs, err := factory.CreateFundSource("An - Cash", decimal.Zero, vnd, details)
		require.NoError(t, err)

		require.NoError(t, repo.CreateFundSource(ctx, testOrgID, fs))

		want := dbmodels.LedgersFundSource{
			OrgID:     testOrgID,
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

// assertFundSourceRow compares the stored row with want; created_at is set by the database, so it is ignored.
func assertFundSourceRow(t *testing.T, ctx context.Context, id domain.FundSourceUUID, want dbmodels.LedgersFundSource) {
	t.Helper()

	got, err := dbmodels.New(pgxDb).GetFundSourceByID(ctx, dbmodels.GetFundSourceByIDParams{OrgID: testOrgID, Uuid: id})
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
