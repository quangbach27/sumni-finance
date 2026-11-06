//go:build component

package ledgers_test

import (
	"context"
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
	ledgersClients "backend/internal/ledgers/ports/http/clients"
	"backend/internal/shared"
	"backend/tests/utils"
)

func getUnlockedLedgerPeriod(t *testing.T, clients *utils.TestClients, token string) *ledgersClients.GetUnlockedLedgerPeriodClientResponse {
	t.Helper()

	resp, err := clients.Ledgers.GetUnlockedLedgerPeriodWithResponse(context.Background(), utils.AuthEditorFn(token))
	require.NoError(t, err)

	return resp
}

func TestGetUnlockedLedgerPeriod(t *testing.T) {
	t.Run("returns period with current balances and entry totals", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs1 := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		_, fs2 := createFundSource(t, clients, token, domain.FundSourceTypeBank)
		period := openPeriod(t, clients, token, fs1, fs2)

		resp := postLedgerEntries(t, clients, token, period,
			entryInput(fs1, shared.DirectionOutflow, 300_000),
			entryInput(fs1, shared.DirectionInflow, 50_000),
			entryInput(fs2, shared.DirectionInflow, 10_000),
		)
		require.Equal(t, 201, resp.StatusCode(), "body: %s", string(resp.Body))

		got := getUnlockedLedgerPeriod(t, clients, token)
		require.Equal(t, 200, got.StatusCode(), "body: %s", string(got.Body))
		require.NotNil(t, got.JSON200)

		lp := got.JSON200.LedgerPeriod
		assert.Equal(t, period.String(), lp.Uuid.String())
		assert.True(t, lp.TotalInflow.Equal(decimal.NewFromInt(60_000)), "inflow %s", lp.TotalInflow)
		assert.True(t, lp.TotalOutflow.Equal(decimal.NewFromInt(300_000)), "outflow %s", lp.TotalOutflow)
		assert.EqualValues(t, 3, lp.EntryCount)
		require.Len(t, lp.Statements, 2)

		want := map[string]int64{fs1.String(): 750_000, fs2.String(): 1_010_000}
		for _, st := range lp.Statements {
			assert.True(t, st.OpeningBalance.Equal(decimal.NewFromInt(1_000_000)))
			assert.True(t, st.CurrentBalance.Equal(decimal.NewFromInt(want[st.FundSourceUuid.String()])),
				"fund source %s current %s", st.FundSourceUuid, st.CurrentBalance)
		}
	})

	t.Run("period without entries has zero totals", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		openPeriod(t, clients, token, fs)

		got := getUnlockedLedgerPeriod(t, clients, token)
		require.Equal(t, 200, got.StatusCode(), "body: %s", string(got.Body))
		assert.True(t, got.JSON200.LedgerPeriod.TotalInflow.IsZero())
		assert.True(t, got.JSON200.LedgerPeriod.TotalOutflow.IsZero())
		assert.EqualValues(t, 0, got.JSON200.LedgerPeriod.EntryCount)
	})

	t.Run("closed but not reconciled period is still returned", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)
		require.Equal(t, 204, closeLedgerPeriod(t, clients, token, period).StatusCode())

		got := getUnlockedLedgerPeriod(t, clients, token)
		require.Equal(t, 200, got.StatusCode(), "body: %s", string(got.Body))
		assert.Equal(t, period.String(), got.JSON200.LedgerPeriod.Uuid.String())
	})

	t.Run("404 when every period is reconciled or none exists", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()

		got := getUnlockedLedgerPeriod(t, clients, token)
		require.Equal(t, 404, got.StatusCode(), "body: %s", string(got.Body))
		require.NotNil(t, got.JSON404)
		assert.Equal(t, "open-ledger-not-found", got.JSON404.Slug)
	})

	t.Run("401 without a token", func(t *testing.T) {
		clients := utils.NewTestClients(t)

		got := getUnlockedLedgerPeriod(t, clients, "")
		assert.Equal(t, 401, got.StatusCode())
	})
}
