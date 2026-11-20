//go:build component

package ledgers_test

import (
	"context"
	"testing"
	"time"

	openapi_types "github.com/oapi-codegen/runtime/types"
	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
	ledgersClients "backend/internal/ledgers/ports/http/clients"
	"backend/internal/shared"
	"backend/tests/utils"
)

// Not parallel for the same reason as the period tests: one unlocked period at a time.

func entryInput(direction shared.Direction, amount int64) ledgersClients.LedgerEntryInput {
	return ledgersClients.LedgerEntryInput{
		Amount:      decimal.NewFromInt(amount),
		Direction:   direction,
		Description: "entry",
		OccurredAt:  time.Date(2026, 11, 2, 0, 0, 0, 0, time.UTC),
	}
}

func postLedgerEntries(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	period domain.LedgerPeriodUUID,
	fs domain.FundSourceUUID,
	entries ...ledgersClients.LedgerEntryInput,
) *ledgersClients.PostLedgerEntriesClientResponse {
	t.Helper()

	resp, err := clients.Ledgers.PostLedgerEntriesWithResponse(
		context.Background(), period, ledgersClients.PostLedgerEntriesJSONRequestBody{FundSourceUuid: fs, Entries: entries}, utils.AuthEditorFn(token))
	require.NoError(t, err)

	return resp
}

func fundSourceBalance(t *testing.T, clients *utils.TestClients, token string, id domain.FundSourceUUID) decimal.Decimal {
	t.Helper()

	for _, fs := range listFundSources(t, clients, token) {
		if fs.Uuid.String() == id.String() {
			return fs.Balance
		}
	}
	t.Fatalf("fund source %s not listed", id.String())

	return decimal.Zero
}

func openPeriod(t *testing.T, clients *utils.TestClients, token string, fs ...domain.FundSourceUUID) domain.LedgerPeriodUUID {
	t.Helper()

	resp := openLedgerPeriod(t, clients, token, novemberPeriodRequest(time.November, fs...))
	require.Equal(t, 201, resp.StatusCode(), "body: %s", string(resp.Body))

	return resp.JSON201.LedgerPeriodUuid
}

func TestPostLedgerEntries(t *testing.T) {
	t.Run("posts a batch and updates fund source balances", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs1 := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		_, fs2 := createFundSource(t, clients, token, domain.FundSourceTypeBank)
		period := openPeriod(t, clients, token, fs1, fs2)

		resp := postLedgerEntries(t, clients, token, period, fs1,
			entryInput(shared.DirectionOutflow, 300_000),
			entryInput(shared.DirectionInflow, 50_000),
		)
		require.Equal(t, 201, resp.StatusCode(), "body: %s", string(resp.Body))
		require.NotNil(t, resp.JSON201)
		assert.Len(t, resp.JSON201.LedgerEntryUuids, 2)

		assert.True(t, fundSourceBalance(t, clients, token, fs1).Equal(decimal.NewFromInt(750_000)))
		// The other fund source of the period is untouched.
		assert.True(t, fundSourceBalance(t, clients, token, fs2).Equal(decimal.NewFromInt(1_000_000)))
	})

	t.Run("insufficient balance rejects the whole batch", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		resp := postLedgerEntries(t, clients, token, period, fs,
			entryInput(shared.DirectionInflow, 1_000),
			entryInput(shared.DirectionOutflow, 5_000_000),
		)
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
		require.NotNil(t, resp.JSON400)
		assert.Equal(t, "insufficient-balance", resp.JSON400.Slug)

		assert.True(t, fundSourceBalance(t, clients, token, fs).Equal(decimal.NewFromInt(1_000_000)))
	})

	t.Run("rejects invalid entries with the entry index", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		bad := entryInput(shared.DirectionInflow, 0)
		bad.Description = " "
		resp := postLedgerEntries(t, clients, token, period, fs, entryInput(shared.DirectionInflow, 1), bad)
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
		require.NotNil(t, resp.JSON400)
		assert.ElementsMatch(t, []string{"amount-must-be-positive", "description-required"}, errorSlugs(resp.JSON400))
		for _, d := range *resp.JSON400.Details {
			require.NotNil(t, d.EntityId)
			assert.Equal(t, "1", *d.EntityId)
		}
	})

	t.Run("rejects an empty list", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		resp := postLedgerEntries(t, clients, token, period, fs)
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "entries-required", resp.JSON400.Slug)
	})

	t.Run("fund source outside the period statements is rejected", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, inPeriod := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		_, outside := createFundSource(t, clients, token, domain.FundSourceTypeBank)
		period := openPeriod(t, clients, token, inPeriod)

		resp := postLedgerEntries(t, clients, token, period, outside, entryInput(shared.DirectionInflow, 1_000))
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
		require.NotNil(t, resp.JSON400)
		assert.Equal(t, "fund-source-not-in-period", resp.JSON400.Slug)

		assert.True(t, fundSourceBalance(t, clients, token, outside).Equal(decimal.NewFromInt(1_000_000)))
	})

	t.Run("rejects a missing fund source", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		resp := postLedgerEntries(t, clients, token, period, domain.FundSourceUUID{}, entryInput(shared.DirectionInflow, 1))
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "fund-source-required", resp.JSON400.Slug)
	})

	t.Run("unknown period is not found", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)

		resp := postLedgerEntries(t, clients, token, domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()}, fs, entryInput(shared.DirectionInflow, 1))
		require.Equal(t, 404, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "ledger-period-not-found", resp.JSON404.Slug)
	})

	t.Run("closed period conflicts", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		closeResp := closeLedgerPeriod(t, clients, token, period)
		require.Equal(t, 204, closeResp.StatusCode(), "body: %s", string(closeResp.Body))

		resp := postLedgerEntries(t, clients, token, period, fs, entryInput(shared.DirectionInflow, 1))
		require.Equal(t, 409, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "period-not-open", resp.JSON409.Slug)
	})
}

func voidLedgerEntry(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	entry openapi_types.UUID,
	reason string,
) *ledgersClients.VoidLedgerEntryClientResponse {
	t.Helper()

	resp, err := clients.Ledgers.VoidLedgerEntryWithResponse(
		context.Background(), entry, ledgersClients.VoidLedgerEntryJSONRequestBody{Reason: reason}, utils.AuthEditorFn(token))
	require.NoError(t, err)

	return resp
}

func TestVoidLedgerEntry(t *testing.T) {
	setup := func(t *testing.T) (*utils.TestClients, string, domain.LedgerPeriodUUID, domain.FundSourceUUID, openapi_types.UUID) {
		t.Helper()

		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		resp := postLedgerEntries(t, clients, token, period, fs, entryInput(shared.DirectionOutflow, 300_000))
		require.Equal(t, 201, resp.StatusCode(), "body: %s", string(resp.Body))

		return clients, token, period, fs, openapi_types.UUID(resp.JSON201.LedgerEntryUuids[0].UUID)
	}

	t.Run("voids the entry, adds a reversal and restores the balance", func(t *testing.T) {
		clients, token, _, fs, entry := setup(t)

		resp := voidLedgerEntry(t, clients, token, entry, "wrong amount")
		require.Equal(t, 204, resp.StatusCode(), "body: %s", string(resp.Body))

		assert.True(t, fundSourceBalance(t, clients, token, fs).Equal(decimal.NewFromInt(1_000_000)))

		got, err := clients.Ledgers.GetLedgerEntryWithResponse(context.Background(), entry, utils.AuthEditorFn(token))
		require.NoError(t, err)
		require.NotNil(t, got.JSON200)
		assert.Equal(t, "voided", got.JSON200.Entry.Status.String())
		assert.NotNil(t, got.JSON200.Entry.ReversedByEntryUuid)
	})

	t.Run("voiding twice is rejected", func(t *testing.T) {
		clients, token, _, _, entry := setup(t)

		require.Equal(t, 204, voidLedgerEntry(t, clients, token, entry, "dup").StatusCode())

		resp := voidLedgerEntry(t, clients, token, entry, "again")
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "ledger-entry-already-voided", resp.JSON400.Slug)
	})

	t.Run("a blank reason is rejected", func(t *testing.T) {
		clients, token, _, _, entry := setup(t)

		resp := voidLedgerEntry(t, clients, token, entry, "  ")
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
	})

	t.Run("a closed period rejects the void", func(t *testing.T) {
		clients, token, period, fs, entry := setup(t)

		require.Equal(t, 204, closeLedgerPeriod(t, clients, token, period).StatusCode())

		resp := voidLedgerEntry(t, clients, token, entry, "late")
		require.Equal(t, 409, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "period-not-open", resp.JSON409.Slug)
		assert.True(t, fundSourceBalance(t, clients, token, fs).Equal(decimal.NewFromInt(700_000)))
	})

	t.Run("an unknown entry is not found", func(t *testing.T) {
		clients, token, _, _, _ := setup(t)

		resp := voidLedgerEntry(t, clients, token, openapi_types.UUID(common.NewUUIDv7()), "x")
		require.Equal(t, 404, resp.StatusCode(), "body: %s", string(resp.Body))
	})
}

func TestListLedgerEntriesOrder(t *testing.T) {
	t.Run("same occurred_at lists the last posted entry first", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		// every entry has the same occurred_at, so only created_at can tell them apart
		resp := postLedgerEntries(t, clients, token, period, fs,
			entryInput(shared.DirectionInflow, 1_000),
			entryInput(shared.DirectionInflow, 2_000),
			entryInput(shared.DirectionInflow, 3_000),
		)
		require.Equal(t, 201, resp.StatusCode(), "body: %s", string(resp.Body))
		posted := resp.JSON201.LedgerEntryUuids
		require.Len(t, posted, 3)

		list, err := clients.Ledgers.ListLedgerEntriesWithResponse(context.Background(),
			&ledgersClients.ListLedgerEntriesParams{}, utils.AuthEditorFn(token))
		require.NoError(t, err)
		require.Equal(t, 200, list.StatusCode(), "body: %s", string(list.Body))
		require.Len(t, list.JSON200.Items, 3)

		for i, item := range list.JSON200.Items {
			assert.Equal(t, posted[len(posted)-1-i].UUID.String(), item.Uuid.String())
		}
	})
}
