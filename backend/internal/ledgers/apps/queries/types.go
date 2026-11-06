package queries

import (
	"time"

	"github.com/shopspring/decimal"
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

// LedgerStatementDetail is a fund source statement plus the fund source's live balance.
type LedgerStatementDetail struct {
	FundSourceStatement
	CurrentBalance decimal.Decimal
}

// LedgerPeriodDetail is a ledger period with its statements and entry totals.
type LedgerPeriodDetail struct {
	LedgerPeriod
	TotalInflow  decimal.Decimal
	TotalOutflow decimal.Decimal
	EntryCount   int64
	Statements   []LedgerStatementDetail
}
