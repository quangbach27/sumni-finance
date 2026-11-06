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
	"backend/tests/utils"
)

func generateLedgerPeriodReport(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	period domain.LedgerPeriodUUID,
) *ledgersClients.GenerateLedgerPeriodReportClientResponse {
	t.Helper()

	resp, err := clients.Ledgers.GenerateLedgerPeriodReportWithResponse(
		context.Background(), period, utils.AuthEditorFn(token),
	)
	require.NoError(t, err)

	return resp
}

func TestGenerateLedgerPeriodReport(t *testing.T) {
	t.Run("stores the report uuid on the period", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		resp := generateLedgerPeriodReport(t, clients, token, period)
		require.Equal(t, 200, resp.StatusCode(), "body: %s", string(resp.Body))
		require.NotNil(t, resp.JSON200)
		assert.False(t, resp.JSON200.ReportUuid.IsZero())

		periods := listLedgerPeriods(t, clients, token, nil)
		require.Len(t, periods.Items, 1)
		require.NotNil(t, periods.Items[0].ReportUuid)
		assert.Equal(t, resp.JSON200.ReportUuid.String(), periods.Items[0].ReportUuid.String())
	})

	t.Run("generating twice returns the same report", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		first := generateLedgerPeriodReport(t, clients, token, period)
		require.Equal(t, 200, first.StatusCode(), "body: %s", string(first.Body))
		second := generateLedgerPeriodReport(t, clients, token, period)
		require.Equal(t, 200, second.StatusCode(), "body: %s", string(second.Body))

		assert.Equal(t, first.JSON200.ReportUuid.String(), second.JSON200.ReportUuid.String())

		var count int
		require.NoError(t, utils.DB.QueryRow(context.Background(), "SELECT count(*) FROM ledgers.ledger_period_reports").Scan(&count))
		assert.Equal(t, 1, count)
	})

	t.Run("unknown period is not found", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()

		resp := generateLedgerPeriodReport(t, clients, token, domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()})
		require.Equal(t, 404, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "ledger-period-not-found", resp.JSON404.Slug)
	})

	t.Run("requires authentication", func(t *testing.T) {
		clients := utils.NewTestClients(t)

		resp, err := clients.Ledgers.GenerateLedgerPeriodReportWithResponse(
			context.Background(), domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()},
		)
		require.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode())
	})
}
