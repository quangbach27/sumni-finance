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

type FundSourceSnapshot struct {
	FundSourceUUID FundSourceUUID
	Balance        decimal.Decimal
	BalanceAfter   decimal.Decimal
}

func (f *FundSource) TopUp(amount decimal.Decimal) (FundSourceSnapshot, error) {
	if !amount.IsPositive() {
		return FundSourceSnapshot{}, common.NewInvalidInputError("top-up-amount-invalid", "top up amount must be greater than 0")
	}

	before := f.balance
	f.balance = f.balance.Add(amount)

	return f.snapshot(before), nil
}

func (f *FundSource) Withdraw(amount decimal.Decimal) (FundSourceSnapshot, error) {
	if !amount.IsPositive() {
		return FundSourceSnapshot{}, common.NewInvalidInputError("withdraw-amount-invalid", "withdraw amount must be greater than 0")
	}
	if f.balance.Sub(amount).IsNegative() {
		return FundSourceSnapshot{}, common.NewInvalidInputError("insufficient-balance", "withdraw amount exceeds balance")
	}

	before := f.balance
	f.balance = f.balance.Sub(amount)

	return f.snapshot(before), nil
}

func (f *FundSource) snapshot(before decimal.Decimal) FundSourceSnapshot {
	return FundSourceSnapshot{
		FundSourceUUID: f.uuid,
		Balance:        before,
		BalanceAfter:   f.balance,
	}
}
