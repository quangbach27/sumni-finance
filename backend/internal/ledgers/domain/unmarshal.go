package domain

import (
	"time"

	"github.com/shopspring/decimal"

	"backend/internal/shared"
)

// The Unmarshal* functions rebuild aggregates from persisted data. They skip
// validation because the values are trusted (they came from the database), so
// only adapters should call them. New aggregates must go through factories.

func UnmarshalFundSource(
	uuid FundSourceUUID,
	name string,
	balance decimal.Decimal,
	currency shared.Currency,
	details FundSourceDetails,
) *FundSource {
	return &FundSource{
		uuid:     uuid,
		name:     name,
		balance:  balance,
		currency: currency,
		details:  details,
	}
}

func UnmarshalBankDetails(
	bankCode string,
	bankBin int32,
	bankShortName, ownerName, accountNumber string,
) *BankDetails {
	return &BankDetails{
		bankCode:      bankCode,
		bankBin:       bankBin,
		bankShortName: bankShortName,
		ownerName:     ownerName,
		accountNumber: accountNumber,
	}
}

func UnmarshalCashDetails(ownerName string) *CashDetails {
	return &CashDetails{ownerName: ownerName}
}

func UnmarshalLedgerPeriod(
	uuid LedgerPeriodUUID,
	name string,
	openingBalance decimal.Decimal,
	closingBalance *decimal.Decimal,
	openDate, closeDate time.Time,
	status LedgerStatus,
	reopenReason *string,
	reopenedAt, reconciledAt *time.Time,
) *LedgerPeriod {
	return &LedgerPeriod{
		uuid:           uuid,
		name:           name,
		openingBalance: openingBalance,
		closingBalance: closingBalance,
		openDate:       openDate,
		closeDate:      closeDate,
		status:         status,
		reopenReason:   reopenReason,
		reopenedAt:     reopenedAt,
		reconciledAt:   reconciledAt,
	}
}
