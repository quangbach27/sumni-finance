package queries

import "github.com/shopspring/decimal"

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
