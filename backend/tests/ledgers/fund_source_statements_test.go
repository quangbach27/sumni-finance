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
	"backend/tests/utils"
)

func reconcileStatements(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	period domain.LedgerPeriodUUID,
	inputs ...ledgersClients.ReconcileStatementInput,
) *ledgersClients.ReconcileFundSourceStatementsClientResponse {
	t.Helper()

	resp, err := clients.Ledgers.ReconcileFundSourceStatementsWithResponse(
		context.Background(), period, ledgersClients.ReconcileFundSourceStatementsJSONRequestBody{Statements: inputs}, utils.AuthEditorFn(token))
	require.NoError(t, err)

	return resp
}

func actual(st ledgersClients.FundSourceStatement, balance int64) ledgersClients.ReconcileStatementInput {
	return ledgersClients.ReconcileStatementInput{StatementUuid: st.Uuid, ActualBalance: decimal.NewFromInt(balance)}
}

// closedPeriodWithTwoStatements returns a closed period whose statements close at 1,000,000 each.
func closedPeriodWithTwoStatements(
	t *testing.T,
	clients *utils.TestClients,
	token string,
) (domain.LedgerPeriodUUID, ledgersClients.FundSourceStatement, ledgersClients.FundSourceStatement) {
	t.Helper()

	_, fs1 := createFundSource(t, clients, token, domain.FundSourceTypeCash)
	_, fs2 := createFundSource(t, clients, token, domain.FundSourceTypeBank)
	period := openPeriod(t, clients, token, fs1, fs2)
	require.Equal(t, 204, closeLedgerPeriod(t, clients, token, period).StatusCode())

	statements := listStatements(t, clients, token, period)

	return period, statementFor(t, statements, fs1), statementFor(t, statements, fs2)
}

func TestReconcileFundSourceStatements(t *testing.T) {
	t.Run("reconciles many statements", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		period, st1, st2 := closedPeriodWithTwoStatements(t, clients, token)

		resp := reconcileStatements(t, clients, token, period, actual(st1, 1_000_000), actual(st2, 1_000_000))
		require.Equal(t, 204, resp.StatusCode(), "body: %s", string(resp.Body))

		for _, st := range listStatements(t, clients, token, period) {
			require.NotNil(t, st.ActualBalance)
			assert.True(t, st.ActualBalance.Equal(decimal.NewFromInt(1_000_000)))
			require.NotNil(t, st.ReconciledAt)
			require.NotNil(t, st.ReconciledBy)
			assert.NotEmpty(t, *st.ReconciledBy)
		}
	})

	t.Run("one mismatch rejects the whole batch", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		period, st1, st2 := closedPeriodWithTwoStatements(t, clients, token)

		resp := reconcileStatements(t, clients, token, period, actual(st1, 1_000_000), actual(st2, 999_000))
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
		require.NotNil(t, resp.JSON400)
		assert.Equal(t, []string{"balance-mismatch"}, errorSlugs(resp.JSON400))
		require.NotNil(t, resp.JSON400.Details)
		require.NotNil(t, (*resp.JSON400.Details)[0].EntityId)
		assert.Equal(t, st2.Uuid.String(), *(*resp.JSON400.Details)[0].EntityId)

		for _, st := range listStatements(t, clients, token, period) {
			assert.Nil(t, st.ReconciledAt, "nothing must be persisted")
		}
	})

	t.Run("reconciling twice fails", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		period, st1, st2 := closedPeriodWithTwoStatements(t, clients, token)

		require.Equal(t, 204, reconcileStatements(t, clients, token, period, actual(st1, 1_000_000)).StatusCode())

		resp := reconcileStatements(t, clients, token, period, actual(st1, 1_000_000), actual(st2, 1_000_000))
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, []string{"fund-source-statement-already-reconciled"}, errorSlugs(resp.JSON400))
	})

	t.Run("open period conflicts", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)
		st := statementFor(t, listStatements(t, clients, token, period), fs)

		resp := reconcileStatements(t, clients, token, period, actual(st, 1_000_000))
		require.Equal(t, 409, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "period-not-closed", resp.JSON409.Slug)
	})

	t.Run("unknown statement is not found", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		period, _, _ := closedPeriodWithTwoStatements(t, clients, token)

		unknown := ledgersClients.ReconcileStatementInput{
			StatementUuid: domain.FundSourceStatementUUID{UUID: common.NewUUIDv7()},
			ActualBalance: decimal.NewFromInt(1),
		}
		resp := reconcileStatements(t, clients, token, period, unknown)
		require.Equal(t, 404, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "fund-source-statement-not-found", resp.JSON404.Slug)
	})

	t.Run("rejects an empty list and duplicates", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		period, st1, _ := closedPeriodWithTwoStatements(t, clients, token)

		resp := reconcileStatements(t, clients, token, period)
		assert.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))

		resp = reconcileStatements(t, clients, token, period, actual(st1, 1_000_000), actual(st1, 1_000_000))
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "duplicate-statement", resp.JSON400.Slug)
	})

	t.Run("unknown period is not found", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()

		in := ledgersClients.ReconcileStatementInput{
			StatementUuid: domain.FundSourceStatementUUID{UUID: common.NewUUIDv7()},
			ActualBalance: decimal.NewFromInt(1),
		}
		resp := reconcileStatements(t, clients, token, domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()}, in)
		require.Equal(t, 404, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "ledger-period-not-found", resp.JSON404.Slug)
	})

	t.Run("unauthenticated request is rejected", func(t *testing.T) {
		clients := utils.NewTestClients(t)

		resp, err := clients.Ledgers.ReconcileFundSourceStatementsWithResponse(
			context.Background(),
			domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()},
			ledgersClients.ReconcileFundSourceStatementsJSONRequestBody{},
		)
		require.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode())
	})
}

func TestListFundSourceStatements(t *testing.T) {
	t.Run("unknown period is not found", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()

		resp, err := clients.Ledgers.ListFundSourceStatementsWithResponse(
			context.Background(), domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()}, utils.AuthEditorFn(token))
		require.NoError(t, err)
		require.Equal(t, 404, resp.StatusCode(), "body: %s", string(resp.Body))
	})
}

func reconcileLedgerPeriod(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	period domain.LedgerPeriodUUID,
) *ledgersClients.ReconcileLedgerPeriodClientResponse {
	t.Helper()

	resp, err := clients.Ledgers.ReconcileLedgerPeriodWithResponse(context.Background(), period, utils.AuthEditorFn(token))
	require.NoError(t, err)

	return resp
}

func TestReconcileLedgerPeriod(t *testing.T) {
	t.Run("reconciles the period when every statement is reconciled", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		period, st1, st2 := closedPeriodWithTwoStatements(t, clients, token)
		require.Equal(t, 204, reconcileStatements(t, clients, token, period, actual(st1, 1_000_000), actual(st2, 1_000_000)).StatusCode())

		resp := reconcileLedgerPeriod(t, clients, token, period)
		require.Equal(t, 204, resp.StatusCode(), "body: %s", string(resp.Body))

		periods := listLedgerPeriods(t, clients, token, nil)
		require.Len(t, periods.Items, 1)
		assert.Equal(t, "reconciled", periods.Items[0].Status.String())
		require.NotNil(t, periods.Items[0].ClosingBalance)
		assert.True(t, periods.Items[0].ClosingBalance.Equal(decimal.NewFromInt(2_000_000)))
		assert.NotNil(t, periods.Items[0].ReconciledAt)

		// The period is locked, so a new one can be opened.
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		open := openLedgerPeriod(t, clients, token, novemberPeriodRequest(time.December, fs))
		assert.Equal(t, 201, open.StatusCode(), "body: %s", string(open.Body))
	})

	t.Run("fails while a statement is not reconciled", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		period, st1, st2 := closedPeriodWithTwoStatements(t, clients, token)
		require.Equal(t, 204, reconcileStatements(t, clients, token, period, actual(st1, 1_000_000)).StatusCode())

		resp := reconcileLedgerPeriod(t, clients, token, period)
		require.Equal(t, 409, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "statements-not-reconciled", resp.JSON409.Slug)
		require.NotNil(t, resp.JSON409.Details)
		require.Len(t, *resp.JSON409.Details, 1)
		require.NotNil(t, (*resp.JSON409.Details)[0].EntityId)
		assert.Equal(t, st2.Uuid.String(), *(*resp.JSON409.Details)[0].EntityId)

		periods := listLedgerPeriods(t, clients, token, nil)
		assert.Equal(t, "closed", periods.Items[0].Status.String())
	})

	t.Run("open period conflicts", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		resp := reconcileLedgerPeriod(t, clients, token, period)
		require.Equal(t, 409, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "period-not-closed", resp.JSON409.Slug)
	})

	t.Run("reconciling twice conflicts", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		period, st1, st2 := closedPeriodWithTwoStatements(t, clients, token)
		require.Equal(t, 204, reconcileStatements(t, clients, token, period, actual(st1, 1_000_000), actual(st2, 1_000_000)).StatusCode())
		require.Equal(t, 204, reconcileLedgerPeriod(t, clients, token, period).StatusCode())

		resp := reconcileLedgerPeriod(t, clients, token, period)
		require.Equal(t, 409, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "period-not-closed", resp.JSON409.Slug)
	})

	t.Run("unknown period is not found", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()

		resp := reconcileLedgerPeriod(t, clients, token, domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()})
		require.Equal(t, 404, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "ledger-period-not-found", resp.JSON404.Slug)
	})

	t.Run("unauthenticated request is rejected", func(t *testing.T) {
		clients := utils.NewTestClients(t)

		resp, err := clients.Ledgers.ReconcileLedgerPeriodWithResponse(context.Background(), domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()})
		require.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode())
	})
}
