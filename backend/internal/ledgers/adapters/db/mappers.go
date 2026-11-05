package db

import (
	"fmt"

	common "github.com/quangbach27/golang-common"

	"backend/internal/ledgers/adapters/db/dbmodels"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

// fundSourceToDomain rebuilds a fund source from a row. Values are trusted
// (they came from the database), so no domain validation runs.
func fundSourceToDomain(row dbmodels.LedgersFundSource) (*domain.FundSource, error) {
	currency, err := common.NewEnum[shared.Currency](row.Currency)
	if err != nil {
		return nil, fmt.Errorf("fund source %s: invalid currency %q: %w", row.Uuid, row.Currency, err)
	}

	var details domain.FundSourceDetails

	switch {
	case row.Type.Equal(domain.FundSourceTypeBank.Enum):
		if row.BankCode == nil || row.BankBin == nil || row.BankShortName == nil || row.AccountNumber == nil {
			return nil, fmt.Errorf("fund source %s: bank details are incomplete", row.Uuid)
		}

		details = domain.UnmarshalBankDetails(
			*row.BankCode, *row.BankBin, *row.BankShortName, row.OwnerName, *row.AccountNumber,
		)
	case row.Type.Equal(domain.FundSourceTypeCash.Enum):
		details = domain.UnmarshalCashDetails(row.OwnerName)
	default:
		return nil, fmt.Errorf("fund source %s: unsupported type %q", row.Uuid, row.Type.String())
	}

	return domain.UnmarshalFundSource(row.Uuid, row.Name, row.Balance, currency, details), nil
}

func ledgerPeriodToCreateParams(p *domain.LedgerPeriod) dbmodels.CreateLedgerPeriodParams {
	return dbmodels.CreateLedgerPeriodParams{
		Uuid:           p.UUID(),
		Name:           p.Name(),
		OpeningBalance: p.OpeningBalance(),
		OpenDate:       p.OpenDate(),
		CloseDate:      p.CloseDate(),
		Status:         p.Status(),
	}
}

func fundSourceStatementToCreateParams(s *domain.FundSourceStatement) dbmodels.CreateFundSourceStatementParams {
	return dbmodels.CreateFundSourceStatementParams{
		Uuid:             s.UUID(),
		LedgerPeriodUuid: s.LedgerPeriodUUID(),
		FundSourceUuid:   s.FundSourceUUID(),
		OpeningBalance:   s.OpeningBalance(),
	}
}
