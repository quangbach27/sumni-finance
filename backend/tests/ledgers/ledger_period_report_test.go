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

func getLedgerPeriodReport(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	report domain.ReportUUID,
) *ledgersClients.GetLedgerPeriodReportClientResponse {
	t.Helper()

	resp, err := clients.Ledgers.GetLedgerPeriodReportWithResponse(
		context.Background(), report, utils.AuthEditorFn(token),
	)
	require.NoError(t, err)

	return resp
}

type reportFixture struct {
	period domain.LedgerPeriodUUID
	fs     domain.FundSourceUUID
	food   ledgersClients.Category
	salary ledgersClients.Category
}

// reportedPeriod opens a period with one cash fund source (1,000,000), posts entries on the
// Food category, its Rice sub-category and Salary, then closes it. It reconciles the
// statements and the period when reconcile is true.
func reportedPeriod(t *testing.T, clients *utils.TestClients, token string, reconcile bool) reportFixture {
	t.Helper()

	_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
	period := openPeriod(t, clients, token, fs)

	require.Equal(t, 200, upsertCategories(t, clients, token,
		ledgersClients.CategoryInput{Name: "Food", SubCategories: &[]ledgersClients.SubCategoryInput{{Name: "Rice"}}},
		ledgersClients.CategoryInput{Name: "Salary"},
	).StatusCode())

	var food, salary ledgersClients.Category
	for _, c := range listCategories(t, clients, token) {
		switch c.Name {
		case "Food":
			food = c
		case "Salary":
			salary = c
		}
	}
	require.NotEmpty(t, food.SubCategories)

	onFood, onRice, onSalary := entryInput(shared.DirectionOutflow, 1_000), entryInput(shared.DirectionOutflow, 2_000), entryInput(shared.DirectionInflow, 5_000)
	onFood.CategoryUuid = food.Uuid
	onRice.CategoryUuid = food.SubCategories[0].Uuid
	onSalary.CategoryUuid = salary.Uuid

	resp := postLedgerEntries(t, clients, token, period, fs, onFood, onRice, onSalary)
	require.Equal(t, 201, resp.StatusCode(), "body: %s", string(resp.Body))
	require.Equal(t, 204, closeLedgerPeriod(t, clients, token, period).StatusCode())

	if reconcile {
		st := statementFor(t, listStatements(t, clients, token, period), fs)
		require.NotNil(t, st.ClosingBalance)
		require.Equal(t, 204, reconcileStatements(t, clients, token, period,
			ledgersClients.ReconcileStatementInput{StatementUuid: st.Uuid, ActualBalance: *st.ClosingBalance}).StatusCode())
		require.Equal(t, 204, reconcileLedgerPeriod(t, clients, token, period).StatusCode())
	}

	return reportFixture{period: period, fs: fs, food: food, salary: salary}
}

func dec(n int64) decimal.Decimal { return decimal.NewFromInt(n) }

func TestGenerateLedgerPeriodReport(t *testing.T) {
	t.Run("generates the report of a reconciled period", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		fx := reportedPeriod(t, clients, token, true)

		resp := generateLedgerPeriodReport(t, clients, token, fx.period)
		require.Equal(t, 200, resp.StatusCode(), "body: %s", string(resp.Body))
		require.NotNil(t, resp.JSON200)
		assert.False(t, resp.JSON200.ReportUuid.IsZero())

		periods := listLedgerPeriods(t, clients, token, nil)
		require.Len(t, periods.Items, 1)
		require.NotNil(t, periods.Items[0].ReportUuid)
		assert.Equal(t, resp.JSON200.ReportUuid.String(), periods.Items[0].ReportUuid.String())

		got := getLedgerPeriodReport(t, clients, token, resp.JSON200.ReportUuid)
		require.Equal(t, 200, got.StatusCode(), "body: %s", string(got.Body))
		report := got.JSON200
		require.NotNil(t, report)

		assert.Equal(t, resp.JSON200.ReportUuid.String(), report.UUID.String())
		assert.Equal(t, fx.period.String(), report.PeriodUUID.String())

		// ledger: 1,000,000 + 5,000 - 3,000
		assert.True(t, report.Ledger.StartBalance.Equal(dec(1_000_000)), report.Ledger.StartBalance.String())
		assert.True(t, report.Ledger.CloseBalance.Equal(dec(1_002_000)), report.Ledger.CloseBalance.String())
		assert.True(t, report.Ledger.TotalInflow.Equal(dec(5_000)))
		assert.True(t, report.Ledger.TotalOutflow.Equal(dec(3_000)))

		// fund source with its reconciliation
		require.Len(t, report.FundSources, 1)
		fs := report.FundSources[0]
		assert.Equal(t, fx.fs.String(), fs.FundSourceUUID.String())
		assert.True(t, fs.StartBalance.Equal(dec(1_000_000)))
		assert.True(t, fs.CloseBalance.Equal(dec(1_002_000)))
		assert.True(t, fs.TotalInflow.Equal(dec(5_000)))
		assert.True(t, fs.TotalOutflow.Equal(dec(3_000)))
		assert.Equal(t, "reconciled", fs.ReconcileStatus)
		require.NotNil(t, fs.ReconciledBy)
		assert.NotEmpty(t, *fs.ReconciledBy)
		assert.NotNil(t, fs.ReconciledAt)

		// categories: Food (with the Rice tag) and Salary; shares of the 8,000 moved
		require.Len(t, report.Categories, 2)
		food, salary := report.Categories[0], report.Categories[1]
		assert.Equal(t, "Food", food.Name)
		assert.True(t, food.TotalOutflow.Equal(dec(3_000)))
		assert.True(t, food.TotalInflow.IsZero())
		assert.True(t, food.Percentage.Equal(decimal.RequireFromString("37.5")), food.Percentage.String())
		require.Len(t, food.Tags, 1)
		assert.Equal(t, "Rice", food.Tags[0].Name)
		assert.True(t, food.Tags[0].TotalOutflow.Equal(dec(2_000)))
		assert.True(t, food.Tags[0].Difference.Equal(dec(-2_000)))

		assert.Equal(t, "Salary", salary.Name)
		assert.True(t, salary.TotalInflow.Equal(dec(5_000)))
		assert.True(t, salary.Percentage.Equal(decimal.RequireFromString("62.5")), salary.Percentage.String())
		assert.Empty(t, salary.Tags)
	})

	t.Run("generating twice returns the same report", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		fx := reportedPeriod(t, clients, token, true)

		first := generateLedgerPeriodReport(t, clients, token, fx.period)
		require.Equal(t, 200, first.StatusCode(), "body: %s", string(first.Body))
		second := generateLedgerPeriodReport(t, clients, token, fx.period)
		require.Equal(t, 200, second.StatusCode(), "body: %s", string(second.Body))

		assert.Equal(t, first.JSON200.ReportUuid.String(), second.JSON200.ReportUuid.String())

		var count int
		require.NoError(t, utils.DB.QueryRow(context.Background(), "SELECT count(*) FROM ledgers.ledger_period_reports").Scan(&count))
		assert.Equal(t, 1, count)
	})

	t.Run("an opened period is rejected", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		resp := generateLedgerPeriodReport(t, clients, token, period)
		require.Equal(t, 409, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "period-not-reconciled", resp.JSON409.Slug)
	})

	t.Run("a closed but not reconciled period is rejected", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		fx := reportedPeriod(t, clients, token, false)

		resp := generateLedgerPeriodReport(t, clients, token, fx.period)
		require.Equal(t, 409, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "period-not-reconciled", resp.JSON409.Slug)
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

func TestGetLedgerPeriodReport(t *testing.T) {
	t.Run("unknown report is not found", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()

		resp := getLedgerPeriodReport(t, clients, token, domain.ReportUUID{UUID: common.NewUUIDv7()})
		require.Equal(t, 404, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "report-not-found", resp.JSON404.Slug)
	})

	t.Run("another org cannot read the report", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients := utils.NewTestClients(t)
		orgA := newOrgUserToken("org-" + common.NewUUIDv7().String())
		orgB := newOrgUserToken("org-" + common.NewUUIDv7().String())
		fx := reportedPeriod(t, clients, orgA, true)

		generated := generateLedgerPeriodReport(t, clients, orgA, fx.period)
		require.Equal(t, 200, generated.StatusCode(), "body: %s", string(generated.Body))

		own := getLedgerPeriodReport(t, clients, orgA, generated.JSON200.ReportUuid)
		assert.Equal(t, 200, own.StatusCode(), "body: %s", string(own.Body))

		other := getLedgerPeriodReport(t, clients, orgB, generated.JSON200.ReportUuid)
		require.Equal(t, 404, other.StatusCode(), "body: %s", string(other.Body))
		assert.Equal(t, "report-not-found", other.JSON404.Slug)
	})

	t.Run("requires authentication", func(t *testing.T) {
		clients := utils.NewTestClients(t)

		resp, err := clients.Ledgers.GetLedgerPeriodReportWithResponse(
			context.Background(), domain.ReportUUID{UUID: common.NewUUIDv7()},
		)
		require.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode())
	})
}
