package domain

import (
	"context"

	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"

	"backend/internal/shared"
)

type FundSourceRepository interface {
	CreateFundSource(ctx context.Context, fundSource *FundSource) error
	// UpdateBalance(ctx context.Context, uuid FundSourceUUID, updateFn func(*FundSource) error) error
}

type FundSourceUUID struct {
	common.UUID
}

type FundSource struct {
	uuid     FundSourceUUID
	name     string
	balance  decimal.Decimal
	currency shared.Currency
	details  FundSourceDetails
}

func (f *FundSource) UUID() FundSourceUUID       { return f.uuid }
func (f *FundSource) Name() string               { return f.name }
func (f *FundSource) Type() FundSourceType       { return f.details.Type() }
func (f *FundSource) Balance() decimal.Decimal   { return f.balance }
func (f *FundSource) Currency() shared.Currency  { return f.currency }
func (f *FundSource) Details() FundSourceDetails { return f.details }

func (f *FundSource) TopUp(amount decimal.Decimal) error {
	if !amount.IsPositive() {
		return common.NewInvalidInputError("top-up-amount-invalid", "top up amount must be greater than 0")
	}

	f.balance = f.balance.Add(amount)

	return nil
}

func (f *FundSource) Withdraw(amount decimal.Decimal) error {
	if !amount.IsPositive() {
		return common.NewInvalidInputError("withdraw-amount-invalid", "withdraw amount must be greater than 0")
	}
	if f.balance.Sub(amount).IsNegative() {
		return common.NewInvalidInputError("insufficient-balance", "withdraw amount exceeds balance")
	}

	f.balance = f.balance.Sub(amount)

	return nil
}
