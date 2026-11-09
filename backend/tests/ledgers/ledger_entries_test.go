//go:build component

package ledgers_test

import (
	"context"
	"testing"
	"time"

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
