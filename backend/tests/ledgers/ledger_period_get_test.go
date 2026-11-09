//go:build component

package ledgers_test

import (
	"context"
	"testing"

	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
	ledgersClients "backend/internal/ledgers/ports/http/clients"
	"backend/internal/shared"
	"backend/tests/utils"
)

func getLedgerPeriod(t *testing.T, clients *utils.TestClients, token string, period domain.LedgerPeriodUUID) *ledgersClients.GetLedgerPeriodClientResponse {
	t.Helper()

	resp, err := clients.Ledgers.GetLedgerPeriodWithResponse(context.Background(), period, utils.AuthEditorFn(token))
	require.NoError(t, err)

	return resp
}

func TestGetLedgerPeriod(t *testing.T) {
	t.Run("returns period with current balances and entry totals", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		body1, fs1 := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		body2, fs2 := createFundSource(t, clients, token, domain.FundSourceTypeBank)
		period := openPeriod(t, clients, token, fs1, fs2)

		resp := postLedgerEntries(t, clients, token, period, fs1,
			entryInput(shared.DirectionOutflow, 300_000),
			entryInput(shared.DirectionInflow, 50_000),
		)
		require.Equal(t, 201, resp.StatusCode(), "body: %s", string(resp.Body))
		resp = postLedgerEntries(t, clients, token, period, fs2, entryInput(shared.DirectionInflow, 10_000))
		require.Equal(t, 201, resp.StatusCode(), "body: %s", string(resp.Body))

		got := getLedgerPeriod(t, clients, token, period)
		require.Equal(t, 200, got.StatusCode(), "body: %s", string(got.Body))
		require.NotNil(t, got.JSON200)

		lp := got.JSON200.LedgerPeriod
		assert.Equal(t, period.String(), lp.Uuid.String())
		assert.True(t, lp.TotalInflow.Equal(decimal.NewFromInt(60_000)), "inflow %s", lp.TotalInflow)
		assert.True(t, lp.TotalOutflow.Equal(decimal.NewFromInt(300_000)), "outflow %s", lp.TotalOutflow)
		assert.EqualValues(t, 3, lp.EntryCount)
		require.Len(t, lp.Statements, 2)

		want := map[string]int64{fs1.String(): 750_000, fs2.String(): 1_010_000}
		wantBodies := map[string]ledgersClients.CreateFundSourceRequest{fs1.String(): body1, fs2.String(): body2}
		for _, st := range lp.Statements {
			fsID := st.FundSource.Uuid.String()
			assert.True(t, st.OpeningBalance.Equal(decimal.NewFromInt(1_000_000)))
			assert.True(t, st.FundSource.Balance.Equal(decimal.NewFromInt(want[fsID])),
				"fund source %s balance %s", fsID, st.FundSource.Balance)
			assert.Equal(t, wantBodies[fsID].Name, st.FundSource.Name)
			assert.Equal(t, wantBodies[fsID].Type, st.FundSource.Type)
			assert.Equal(t, wantBodies[fsID].Details, st.FundSource.Details)
		}
	})

	t.Run("period without entries has zero totals", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		got := getLedgerPeriod(t, clients, token, period)
		require.Equal(t, 200, got.StatusCode(), "body: %s", string(got.Body))
		assert.True(t, got.JSON200.LedgerPeriod.TotalInflow.IsZero())
		assert.True(t, got.JSON200.LedgerPeriod.TotalOutflow.IsZero())
		assert.EqualValues(t, 0, got.JSON200.LedgerPeriod.EntryCount)
	})

	t.Run("closed period is returned", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)
		require.Equal(t, 204, closeLedgerPeriod(t, clients, token, period).StatusCode())

		got := getLedgerPeriod(t, clients, token, period)
		require.Equal(t, 200, got.StatusCode(), "body: %s", string(got.Body))
		assert.Equal(t, period.String(), got.JSON200.LedgerPeriod.Uuid.String())
	})

	t.Run("reconciled period is returned", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)
		require.Equal(t, 204, closeLedgerPeriod(t, clients, token, period).StatusCode())
		markPeriodReconciled(t, period)

		got := getLedgerPeriod(t, clients, token, period)
		require.Equal(t, 200, got.StatusCode(), "body: %s", string(got.Body))
		assert.Equal(t, "reconciled", got.JSON200.LedgerPeriod.Status.String())
	})

	t.Run("404 for an unknown period", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()

		got := getLedgerPeriod(t, clients, token, domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()})
		require.Equal(t, 404, got.StatusCode(), "body: %s", string(got.Body))
		require.NotNil(t, got.JSON404)
		assert.Equal(t, "ledger-period-not-found", got.JSON404.Slug)
	})

	t.Run("401 without a token", func(t *testing.T) {
		clients := utils.NewTestClients(t)

		got := getLedgerPeriod(t, clients, "", domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()})
		assert.Equal(t, 401, got.StatusCode())
	})
}
