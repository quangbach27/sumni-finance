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

func closeLedgerPeriod(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	period domain.LedgerPeriodUUID,
) *ledgersClients.CloseLedgerPeriodClientResponse {
	t.Helper()

	resp, err := clients.Ledgers.CloseLedgerPeriodWithResponse(context.Background(), period, utils.AuthEditorFn(token))
	require.NoError(t, err)

	return resp
}

func listStatements(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	period domain.LedgerPeriodUUID,
) []ledgersClients.FundSourceStatement {
	t.Helper()

	resp, err := clients.Ledgers.ListFundSourceStatementsWithResponse(context.Background(), period, utils.AuthEditorFn(token))
	require.NoError(t, err)
	require.Equal(t, 200, resp.StatusCode(), "body: %s", string(resp.Body))
	require.NotNil(t, resp.JSON200)

	return resp.JSON200.Items
}

func statementFor(t *testing.T, statements []ledgersClients.FundSourceStatement, fs domain.FundSourceUUID) ledgersClients.FundSourceStatement {
	t.Helper()

	for _, st := range statements {
		if st.FundSourceUuid.String() == fs.String() {
			return st
		}
	}
	t.Fatalf("no statement for fund source %s", fs.String())

	return ledgersClients.FundSourceStatement{}
}

func TestCloseLedgerPeriod(t *testing.T) {
	t.Run("closes the period and sets statement closing balances", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs1 := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		_, fs2 := createFundSource(t, clients, token, domain.FundSourceTypeBank)
		period := openPeriod(t, clients, token, fs1, fs2)

		resp := postLedgerEntries(t, clients, token, period, fs1, entryInput(shared.DirectionOutflow, 300_000))
		require.Equal(t, 201, resp.StatusCode(), "body: %s", string(resp.Body))
		resp = postLedgerEntries(t, clients, token, period, fs2, entryInput(shared.DirectionInflow, 10_000))
		require.Equal(t, 201, resp.StatusCode(), "body: %s", string(resp.Body))

		before := listStatements(t, clients, token, period)
		assert.Nil(t, statementFor(t, before, fs1).ClosingBalance)

		closeResp := closeLedgerPeriod(t, clients, token, period)
		require.Equal(t, 204, closeResp.StatusCode(), "body: %s", string(closeResp.Body))

		after := listStatements(t, clients, token, period)
		require.Len(t, after, 2)

		st1, st2 := statementFor(t, after, fs1), statementFor(t, after, fs2)
		require.NotNil(t, st1.ClosingBalance)
		require.NotNil(t, st2.ClosingBalance)
		assert.True(t, st1.OpeningBalance.Equal(decimal.NewFromInt(1_000_000)))
		assert.True(t, st1.ClosingBalance.Equal(decimal.NewFromInt(700_000)), st1.ClosingBalance.String())
		assert.True(t, st2.ClosingBalance.Equal(decimal.NewFromInt(1_010_000)), st2.ClosingBalance.String())

		periods := listLedgerPeriods(t, clients, token, nil)
		require.Len(t, periods.Items, 1)
		assert.Equal(t, "closed", periods.Items[0].Status.String())
	})

	t.Run("closing twice is rejected", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		require.Equal(t, 204, closeLedgerPeriod(t, clients, token, period).StatusCode())

		resp := closeLedgerPeriod(t, clients, token, period)
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "period-not-open", resp.JSON400.Slug)
	})

	t.Run("unknown period is not found", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()

		resp := closeLedgerPeriod(t, clients, token, domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()})
		require.Equal(t, 404, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "ledger-period-not-found", resp.JSON404.Slug)
	})

	t.Run("unauthenticated request is rejected", func(t *testing.T) {
		clients := utils.NewTestClients(t)

		resp, err := clients.Ledgers.CloseLedgerPeriodWithResponse(context.Background(), domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()})
		require.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode())
	})
}
