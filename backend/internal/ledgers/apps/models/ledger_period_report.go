package models

import (
	"sort"
	"time"

	"backend/internal/ledgers/domain"

	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
)

// Reconcile statuses of a fund source in a report.
const (
	ReconcileStatusReconciled   = "reconciled"
	ReconcileStatusUnreconciled = "unreconciled"
)

// LedgerPeriodReport is the report of one reconciled ledger period. Its content is
// the frozen ReportSnapshot, stored as json.
type LedgerPeriodReport struct {
	uuid       domain.ReportUUID
	periodUUID domain.LedgerPeriodUUID
	snapshot   ReportSnapshot
}

// NewLedgerPeriodReport wraps a snapshot; the report and period UUIDs come from it.
func NewLedgerPeriodReport(snapshot ReportSnapshot) (LedgerPeriodReport, error) {
	var details []common.ErrorDetails

	if snapshot.UUID.IsZero() {
		details = append(details, common.ErrorDetails{EntityType: "ledger-period-report", ErrorSlug: "report-required", Message: "report uuid is required"})
	}
	if snapshot.PeriodUUID.IsZero() {
		details = append(details, common.ErrorDetails{EntityType: "ledger-period-report", ErrorSlug: "ledger-period-required", Message: "ledger period is required"})
	}
	if len(details) > 0 {
		return LedgerPeriodReport{}, common.NewInvalidInputError("invalid-ledger-period-report", "invalid ledger period report").WithDetails(details)
	}

	return LedgerPeriodReport{uuid: snapshot.UUID, periodUUID: snapshot.PeriodUUID, snapshot: snapshot}, nil
}

func (r LedgerPeriodReport) UUID() domain.ReportUUID             { return r.uuid }
func (r LedgerPeriodReport) PeriodUUID() domain.LedgerPeriodUUID { return r.periodUUID }
func (r LedgerPeriodReport) Snapshot() ReportSnapshot            { return r.snapshot }

// ReportSnapshot is the report content stored as json in ledgers.ledger_period_reports.
// Every amount is a decimal (json string).
type ReportSnapshot struct {
	UUID        domain.ReportUUID       `json:"uuid"`
	PeriodUUID  domain.LedgerPeriodUUID `json:"period_uuid"`
	Ledger      LedgerSummary           `json:"ledger"`
	FundSources []FundSourceSummary     `json:"fund_sources"`
	Categories  []CategorySummary       `json:"categories"`
}

// Totals are the balances and the money movement of the ledger or of one fund source.
type Totals struct {
	StartBalance decimal.Decimal `json:"start_balance"`
	CloseBalance decimal.Decimal `json:"close_balance"`
	TotalInflow  decimal.Decimal `json:"total_inflow"`
	TotalOutflow decimal.Decimal `json:"total_outflow"`
}

// LedgerSummary covers the whole ledger period.
type LedgerSummary struct {
	Totals
}

// FundSourceSummary covers one fund source of the period, with its reconciliation.
type FundSourceSummary struct {
	FundSourceUUID domain.FundSourceUUID `json:"fund_source_uuid"`
	Name           string                `json:"name"`
	Totals
	ReconcileStatus string     `json:"reconcile_status"`
	ReconciledBy    *string    `json:"reconciled_by"`
	ReconciledAt    *time.Time `json:"reconciled_at"`
}

// CategorySummary covers one top-level category: the entries posted to it and to its
// sub-categories (tags). Percentage is its share of all the money moved in the period.
type CategorySummary struct {
	CategoryUUID domain.CategoryUUID `json:"category_uuid"`
	Name         string              `json:"name"`
	TotalInflow  decimal.Decimal     `json:"total_inflow"`
	TotalOutflow decimal.Decimal     `json:"total_outflow"`
	Percentage   decimal.Decimal     `json:"percentage"`
	Tags         []TagSummary        `json:"tags"`
}

// TagSummary covers one sub-category. Difference is inflow minus outflow.
type TagSummary struct {
	TagUUID      domain.CategoryUUID `json:"tag_uuid"`
	Name         string              `json:"name"`
	TotalInflow  decimal.Decimal     `json:"total_inflow"`
	TotalOutflow decimal.Decimal     `json:"total_outflow"`
	Difference   decimal.Decimal     `json:"difference"`
}

// ReportPeriod is the ledger period data a report needs.
type ReportPeriod struct {
	UUID           domain.LedgerPeriodUUID
	OpeningBalance decimal.Decimal
	ClosingBalance decimal.Decimal
}

// FundSourceRow is the data of one fund source of the period.
type FundSourceRow struct {
	FundSourceUUID domain.FundSourceUUID
	Name           string
	OpeningBalance decimal.Decimal
	ClosingBalance decimal.Decimal
	TotalInflow    decimal.Decimal // every entry, so opening + inflow - outflow = closing
	TotalOutflow   decimal.Decimal
	ReconciledBy   *string
	ReconciledAt   *time.Time
}

// CategoryRow is the money posted to one category (or sub-category) in the period.
// ParentUUID and ParentName are set when the entries sit on a sub-category.
type CategoryRow struct {
	CategoryUUID domain.CategoryUUID
	Name         string
	ParentUUID   *domain.CategoryUUID
	ParentName   *string
	TotalInflow  decimal.Decimal
	TotalOutflow decimal.Decimal
}

// BuildReportSnapshot assembles the snapshot of a reconciled period.
//
// Ledger inflow and outflow are the sums over the fund sources. Categories count
// live entries only, and a sub-category counts toward its parent category and its own
// tag. A category's percentage is (inflow + outflow) over the same sum of every
// category, so the percentages add up to 100 (0 when nothing was posted).
func BuildReportSnapshot(
	reportUUID domain.ReportUUID,
	period ReportPeriod,
	fundSources []FundSourceRow,
	categories []CategoryRow,
) ReportSnapshot {
	snapshot := ReportSnapshot{
		UUID:        reportUUID,
		PeriodUUID:  period.UUID,
		FundSources: make([]FundSourceSummary, 0, len(fundSources)),
		Categories:  make([]CategorySummary, 0),
	}

	snapshot.Ledger.StartBalance = period.OpeningBalance
	snapshot.Ledger.CloseBalance = period.ClosingBalance

	for _, fs := range fundSources {
		snapshot.FundSources = append(snapshot.FundSources, FundSourceSummary{
			FundSourceUUID: fs.FundSourceUUID,
			Name:           fs.Name,
			Totals: Totals{
				StartBalance: fs.OpeningBalance,
				CloseBalance: fs.ClosingBalance,
				TotalInflow:  fs.TotalInflow,
				TotalOutflow: fs.TotalOutflow,
			},
			ReconcileStatus: domain.LedgerStatusReconciled.String(),
			ReconciledBy:    fs.ReconciledBy,
			ReconciledAt:    fs.ReconciledAt,
		})

		snapshot.Ledger.TotalInflow = snapshot.Ledger.TotalInflow.Add(fs.TotalInflow)
		snapshot.Ledger.TotalOutflow = snapshot.Ledger.TotalOutflow.Add(fs.TotalOutflow)
	}

	snapshot.Categories = buildCategorySummaries(categories)

	return snapshot
}

func buildCategorySummaries(rows []CategoryRow) []CategorySummary {
	byUUID := make(map[domain.CategoryUUID]*CategorySummary)
	order := make([]domain.CategoryUUID, 0)
	grand := decimal.Zero

	top := func(id domain.CategoryUUID, name string) *CategorySummary {
		c, ok := byUUID[id]
		if !ok {
			c = &CategorySummary{CategoryUUID: id, Name: name, Tags: make([]TagSummary, 0)}
			byUUID[id] = c
			order = append(order, id)
		}

		return c
	}

	for _, row := range rows {
		grand = grand.Add(row.TotalInflow).Add(row.TotalOutflow)

		if row.ParentUUID == nil {
			c := top(row.CategoryUUID, row.Name)
			c.TotalInflow = c.TotalInflow.Add(row.TotalInflow)
			c.TotalOutflow = c.TotalOutflow.Add(row.TotalOutflow)

			continue
		}

		parentName := ""
		if row.ParentName != nil {
			parentName = *row.ParentName
		}

		c := top(*row.ParentUUID, parentName)
		c.TotalInflow = c.TotalInflow.Add(row.TotalInflow)
		c.TotalOutflow = c.TotalOutflow.Add(row.TotalOutflow)
		c.Tags = append(c.Tags, TagSummary{
			TagUUID:      row.CategoryUUID,
			Name:         row.Name,
			TotalInflow:  row.TotalInflow,
			TotalOutflow: row.TotalOutflow,
			Difference:   row.TotalInflow.Sub(row.TotalOutflow),
		})
	}

	out := make([]CategorySummary, 0, len(order))

	for _, id := range order {
		c := byUUID[id]
		if grand.IsPositive() {
			c.Percentage = c.TotalInflow.Add(c.TotalOutflow).Mul(decimal.NewFromInt(100)).DivRound(grand, 2)
		}

		sort.SliceStable(c.Tags, func(i, j int) bool { return c.Tags[i].Name < c.Tags[j].Name })

		out = append(out, *c)
	}

	sort.SliceStable(out, func(i, j int) bool { return out[i].Name < out[j].Name })

	return out
}
