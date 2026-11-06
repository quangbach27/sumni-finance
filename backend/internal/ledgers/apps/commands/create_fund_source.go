package commands

import (
	"context"

	common "github.com/quangbach27/golang-common"
	"github.com/quangbach27/golang-common/log"
	"github.com/shopspring/decimal"

	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type BankInput struct {
	BankCode      string
	BankBin       int32
	BankShortName string
	AccountNumber string
}

type CreateFundSource struct {
	Name         string
	Type         domain.FundSourceType
	StartBalance decimal.Decimal
	Currency     shared.Currency
	OwnerName    string
	Bank         *BankInput // set for bank, nil for cash
}

func (h *Handlers) CreateFundSource(ctx context.Context, cmd CreateFundSource) (domain.FundSourceUUID, error) {
	var (
		details domain.FundSourceDetails
		err     error
	)

	switch cmd.Type {
	case domain.FundSourceTypeBank:
		details, err = h.fsFactory.CreateBankDetails(
			ctx,
			cmd.Bank.BankCode,
			cmd.Bank.BankBin,
			cmd.Bank.BankShortName,
			cmd.OwnerName,
			cmd.Bank.AccountNumber,
		)
	case domain.FundSourceTypeCash:
		details, err = h.fsFactory.CreateCashDetails(cmd.OwnerName)
	default:
		err = common.NewInvalidInputError("unsupported-type", "unsupported fund source type %q", cmd.Type.String())
	}
	if err != nil {
		return domain.FundSourceUUID{}, err
	}

	fundSource, err := h.fsFactory.CreateFundSource(cmd.Name, cmd.StartBalance, cmd.Currency, details)
	if err != nil {
		return domain.FundSourceUUID{}, err
	}

	if err := h.fsRepo.CreateFundSource(ctx, fundSource); err != nil {
		return domain.FundSourceUUID{}, err
	}

	log.FromContext(ctx).With("fundSourceUUID", fundSource.UUID().String(), "type", cmd.Type.String()).Info("fund source created")

	return fundSource.UUID(), nil
}
