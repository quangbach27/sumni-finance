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
}
