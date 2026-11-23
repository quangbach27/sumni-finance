package models_test

import (
	"encoding/json"
	"testing"
	"time"

	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/apps/models"
	"backend/internal/ledgers/domain"
)

func dec(n int64) decimal.Decimal { return decimal.NewFromInt(n) }

func catID() domain.CategoryUUID { return domain.CategoryUUID{UUID: common.NewUUIDv7()} }

func TestBuildReportSnapshot(t *testing.T) {
	t.Parallel()

	reportUUID := domain.ReportUUID{UUID: common.NewUUIDv7()}
	period := models.ReportPeriod{
		UUID:           domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()},
		OpeningBalance: dec(1_000),
		ClosingBalance: dec(1_200),
	}

	t.Run("ledger and fund sources", func(t *testing.T) {
		t.Parallel()

		by, at := "user-1", time.Date(2026, 11, 30, 0, 0, 0, 0, time.UTC)
		snap := models.BuildReportSnapshot(reportUUID, period, []models.FundSourceRow{
			{FundSourceUUID: domain.FundSourceUUID{UUID: common.NewUUIDv7()}, Name: "Cash", OpeningBalance: dec(600), ClosingBalance: dec(700), TotalInflow: dec(300), TotalOutflow: dec(200), ReconciledBy: &by, ReconciledAt: &at},
			{FundSourceUUID: domain.FundSourceUUID{UUID: common.NewUUIDv7()}, Name: "Bank", OpeningBalance: dec(400), ClosingBalance: dec(500), TotalInflow: dec(150), TotalOutflow: dec(50)},
		}, nil)

		assert.Equal(t, reportUUID, snap.UUID)
		assert.Equal(t, period.UUID, snap.PeriodUUID)
		assert.True(t, snap.Ledger.StartBalance.Equal(dec(1_000)))
		assert.True(t, snap.Ledger.CloseBalance.Equal(dec(1_200)))
		assert.True(t, snap.Ledger.TotalInflow.Equal(dec(450)))
		assert.True(t, snap.Ledger.TotalOutflow.Equal(dec(250)))

		require.Len(t, snap.FundSources, 2)
		assert.Equal(t, models.ReconcileStatusReconciled, snap.FundSources[0].ReconcileStatus)
		assert.Equal(t, &by, snap.FundSources[0].ReconciledBy)
		assert.Equal(t, models.ReconcileStatusUnreconciled, snap.FundSources[1].ReconcileStatus)
		assert.Nil(t, snap.FundSources[1].ReconciledBy)
	})

	t.Run("sub-categories roll up to their parent and become tags", func(t *testing.T) {
		t.Parallel()

		food, rice, noodle, salary := catID(), catID(), catID(), catID()
		foodName := "Food"
		snap := models.BuildReportSnapshot(reportUUID, period, nil, []models.CategoryRow{
			{CategoryUUID: food, Name: "Food", TotalOutflow: dec(1_000)},
			{CategoryUUID: rice, Name: "Rice", ParentUUID: &food, ParentName: &foodName, TotalOutflow: dec(2_000), TotalInflow: dec(500)},
			{CategoryUUID: noodle, Name: "Noodle", ParentUUID: &food, ParentName: &foodName, TotalOutflow: dec(500)},
			{CategoryUUID: salary, Name: "Salary", TotalInflow: dec(6_000)},
		})

		require.Len(t, snap.Categories, 2)

		f := snap.Categories[0]
		assert.Equal(t, food, f.CategoryUUID)
		assert.Equal(t, "Food", f.Name)
		assert.True(t, f.TotalOutflow.Equal(dec(3_500)))
		assert.True(t, f.TotalInflow.Equal(dec(500)))
		// (3,500 + 500) of 10,000 moved
		assert.True(t, f.Percentage.Equal(dec(40)), f.Percentage.String())

		require.Len(t, f.Tags, 2)
		assert.Equal(t, "Noodle", f.Tags[0].Name) // sorted by name
		assert.True(t, f.Tags[0].Difference.Equal(dec(-500)))
		assert.Equal(t, "Rice", f.Tags[1].Name)
		assert.True(t, f.Tags[1].Difference.Equal(dec(-1_500)))

		s := snap.Categories[1]
		assert.Equal(t, "Salary", s.Name)
		assert.True(t, s.Percentage.Equal(dec(60)), s.Percentage.String())
		assert.Empty(t, s.Tags)
	})

	t.Run("a category known only through its tags still appears", func(t *testing.T) {
		t.Parallel()

		food, rice := catID(), catID()
		foodName := "Food"
		snap := models.BuildReportSnapshot(reportUUID, period, nil, []models.CategoryRow{
			{CategoryUUID: rice, Name: "Rice", ParentUUID: &food, ParentName: &foodName, TotalOutflow: dec(100)},
		})

		require.Len(t, snap.Categories, 1)
		assert.Equal(t, food, snap.Categories[0].CategoryUUID)
		assert.Equal(t, "Food", snap.Categories[0].Name)
		assert.True(t, snap.Categories[0].Percentage.Equal(dec(100)))
	})

	t.Run("percentages are rounded to two decimals and no entries give zero", func(t *testing.T) {
		t.Parallel()

		a, b, c := catID(), catID(), catID()
		snap := models.BuildReportSnapshot(reportUUID, period, nil, []models.CategoryRow{
			{CategoryUUID: a, Name: "A", TotalOutflow: dec(1)},
			{CategoryUUID: b, Name: "B", TotalOutflow: dec(1)},
			{CategoryUUID: c, Name: "C", TotalOutflow: dec(1)},
		})
		for _, cat := range snap.Categories {
			assert.True(t, cat.Percentage.Equal(decimal.RequireFromString("33.33")), cat.Percentage.String())
		}

		empty := models.BuildReportSnapshot(reportUUID, period, nil, nil)
		assert.Empty(t, empty.Categories)
		assert.Empty(t, empty.FundSources)
	})

	t.Run("round-trips through json", func(t *testing.T) {
		t.Parallel()

		food, rice := catID(), catID()
		foodName, by := "Food", "user-1"
		at := time.Date(2026, 11, 30, 1, 2, 3, 0, time.UTC)
		want := models.BuildReportSnapshot(reportUUID, period,
			[]models.FundSourceRow{{FundSourceUUID: domain.FundSourceUUID{UUID: common.NewUUIDv7()}, Name: "Cash", OpeningBalance: dec(1), ClosingBalance: dec(2), ReconciledBy: &by, ReconciledAt: &at}},
			[]models.CategoryRow{{CategoryUUID: rice, Name: "Rice", ParentUUID: &food, ParentName: &foodName, TotalOutflow: dec(100)}},
		)

		raw, err := json.Marshal(want)
		require.NoError(t, err)

		var got models.ReportSnapshot
		require.NoError(t, json.Unmarshal(raw, &got))
		assert.Equal(t, want.UUID, got.UUID)
		assert.Equal(t, want.PeriodUUID, got.PeriodUUID)
		assert.Equal(t, want.Categories[0].CategoryUUID, got.Categories[0].CategoryUUID)
		assert.True(t, want.Categories[0].Tags[0].TotalOutflow.Equal(got.Categories[0].Tags[0].TotalOutflow))
		assert.Equal(t, want.FundSources[0].ReconcileStatus, got.FundSources[0].ReconcileStatus)
		assert.Contains(t, string(raw), `"period_uuid"`)
	})
}

func TestNewLedgerPeriodReport(t *testing.T) {
	t.Parallel()

	_, err := models.NewLedgerPeriodReport(models.ReportSnapshot{})
	require.Error(t, err)

	snap := models.ReportSnapshot{
		UUID:       domain.ReportUUID{UUID: common.NewUUIDv7()},
		PeriodUUID: domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()},
	}
	report, err := models.NewLedgerPeriodReport(snap)
	require.NoError(t, err)
	assert.Equal(t, snap.UUID, report.UUID())
	assert.Equal(t, snap.PeriodUUID, report.PeriodUUID())
}
