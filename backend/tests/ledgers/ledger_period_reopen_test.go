//go:build component

package ledgers_test

import (
	"context"
	"testing"

	common "github.com/quangbach27/golang-common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
	ledgersClients "backend/internal/ledgers/ports/http/clients"
	"backend/internal/shared"
	"backend/tests/utils"
)

func reopenLedgerPeriod(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	period domain.LedgerPeriodUUID,
	reason string,
) *ledgersClients.ReopenLedgerPeriodClientResponse {
	t.Helper()

	resp, err := clients.Ledgers.ReopenLedgerPeriodWithResponse(
		context.Background(), period, ledgersClients.ReopenLedgerPeriodRequest{Reason: reason}, utils.AuthEditorFn(token),
	)
	require.NoError(t, err)

	return resp
}

func TestReopenLedgerPeriod(t *testing.T) {
	t.Run("reopens a closed period and clears closing balances", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		require.Equal(t, 204, closeLedgerPeriod(t, clients, token, period).StatusCode())
		require.NotNil(t, statementFor(t, listStatements(t, clients, token, period), fs).ClosingBalance)

		resp := reopenLedgerPeriod(t, clients, token, period, "missed an entry")
		require.Equal(t, 204, resp.StatusCode(), "body: %s", string(resp.Body))

		assert.Nil(t, statementFor(t, listStatements(t, clients, token, period), fs).ClosingBalance)

		periods := listLedgerPeriods(t, clients, token, nil)
		require.Len(t, periods.Items, 1)
		assert.Equal(t, "opened", periods.Items[0].Status.String())

		post := postLedgerEntries(t, clients, token, period, fs, entryInput(shared.DirectionOutflow, 1_000))
		require.Equal(t, 201, post.StatusCode(), "body: %s", string(post.Body))
		require.Equal(t, 204, closeLedgerPeriod(t, clients, token, period).StatusCode())
	})

	t.Run("opened period is rejected", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		resp := reopenLedgerPeriod(t, clients, token, period, "why")
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "period-not-closed", resp.JSON400.Slug)
	})

	t.Run("reconciled period is locked", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)
		require.Equal(t, 204, closeLedgerPeriod(t, clients, token, period).StatusCode())
		markPeriodReconciled(t, period)

		resp := reopenLedgerPeriod(t, clients, token, period, "why")
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "period-locked", resp.JSON400.Slug)
	})

	t.Run("blank reason is rejected", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)
		require.Equal(t, 204, closeLedgerPeriod(t, clients, token, period).StatusCode())

		resp := reopenLedgerPeriod(t, clients, token, period, "   ")
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "reopen-reason-required", resp.JSON400.Slug)
	})

	t.Run("reconciled statement blocks reopen", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)
		require.Equal(t, 204, closeLedgerPeriod(t, clients, token, period).StatusCode())

		_, err := utils.DB.Exec(context.Background(),
			"UPDATE ledgers.fund_source_statements SET actual_balance = closing_balance, reconciled_by = 'tester', reconciled_at = now() WHERE ledger_period_uuid = $1",
			period,
		)
		require.NoError(t, err)

		resp := reopenLedgerPeriod(t, clients, token, period, "why")
		require.Equal(t, 409, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "fund-source-statement-reconciled", resp.JSON409.Slug)
	})

	t.Run("unknown period is not found", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()

		resp := reopenLedgerPeriod(t, clients, token, domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()}, "why")
		require.Equal(t, 404, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "ledger-period-not-found", resp.JSON404.Slug)
	})

	t.Run("unauthenticated request is rejected", func(t *testing.T) {
		clients := utils.NewTestClients(t)

		resp, err := clients.Ledgers.ReopenLedgerPeriodWithResponse(
			context.Background(), domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()}, ledgersClients.ReopenLedgerPeriodRequest{Reason: "why"},
		)
		require.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode())
	})
}
