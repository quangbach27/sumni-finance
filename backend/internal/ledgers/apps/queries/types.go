package queries

import (
	"time"

	"github.com/shopspring/decimal"

	"backend/internal/ledgers/domain"
)

type FundSource struct {
	UUID     string
	Name     string
	Type     string // "bank" | "cash"
	Balance  decimal.Decimal
	Currency string
	Details  FundSourceDetails
}

type FundSourceDetails struct {
	OwnerName string
	Bank      *BankDetails // nil for cash
}

type BankDetails struct {
	BankCode      string
	BankBin       int32
	BankShortName string
	AccountNumber string
}

type LedgerPeriod struct {
	UUID           string
	Name           string
	OpeningBalance decimal.Decimal
	ClosingBalance *decimal.Decimal // nil until reconciled
	OpenDate       time.Time
	CloseDate      time.Time
	Status         string // "opened" | "closed" | "reconciled"
	ReopenReason   *string
	ReopenedAt     *time.Time
	ReconciledAt   *time.Time
	ReportUUID     *string
}

type FundSourceStatement struct {
	UUID           string
	FundSourceUUID string
	OpeningBalance decimal.Decimal
	ClosingBalance *decimal.Decimal // nil until the period is closed
	ActualBalance  *decimal.Decimal // nil until reconciled
	ReconciledBy   *string
	ReconciledAt   *time.Time
}

// LedgerStatementDetail is a fund source statement plus the fund source it belongs to.
type LedgerStatementDetail struct {
	FundSourceStatement
	FundSource FundSource
}

// LedgerPeriodDetail is a ledger period with its statements and entry totals.
type LedgerPeriodDetail struct {
	LedgerPeriod
	TotalInflow  decimal.Decimal
	TotalOutflow decimal.Decimal
	EntryCount   int64
	Statements   []LedgerStatementDetail
	// CategorySummaries groups posted entries by top-level category.
	CategorySummaries []CategorySummary
}

// CategorySummary totals the posted entries of one top-level category in a period.
// CategoryUUID is nil for entries without a known category.
type CategorySummary struct {
	CategoryUUID *string
	EntryCount   int64
	TotalInflow  decimal.Decimal
	TotalOutflow decimal.Decimal
}

// Category is a category of a period; SubCategories is empty for a sub-category.
type Category struct {
	UUID          string
	Name          string
	Description   *string
	SubCategories []Category
}

// FundSourceDetail is a fund source with the time of its latest entry.
type FundSourceDetail struct {
	FundSource
	LatestEntryAt *time.Time // nil without entries
}

// LedgerEntryListItem is a ledger entry with the names needed to display it.
// Category is the top-level category; Tag is the sub-category, when the entry
// has one.
type LedgerEntryListItem struct {
	UUID                string
	LedgerPeriod        LedgerEntryPeriod
	FundSource          LedgerEntryFundSource
	OccurredAt          time.Time
	Description         string
	Direction           string // "inflow" | "outflow"
	Amount              decimal.Decimal
	BalanceBefore       decimal.Decimal
	BalanceAfter        decimal.Decimal
	Category            *CategoryRef
	Tag                 *CategoryRef
	Status              domain.EntryStatus
	Kind                domain.EntryKind
	CreatedAt           time.Time
	CreatedBy           string
	ReversedByEntryUUID *string
	ReversesEntryUUID   *string
	VoidedReason        *string
	VoidedBy            *string
	VoidedAt            *time.Time
}

type LedgerEntryPeriod struct {
	UUID   string
	Name   string
	Status string // "opened" | "closed" | "reconciled"
}

type LedgerEntryFundSource struct {
	UUID          string
	Name          string
	BankCode      *string // bank only
	AccountNumber *string // bank only
}

type CategoryRef struct {
	UUID string
	Name string
}
