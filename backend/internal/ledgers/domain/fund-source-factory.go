package domain

import (
	"context"
	"errors"
	"strings"

	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"

	"backend/internal/shared"
)

type BankAccountVerifier interface {
	Verify(ctx context.Context, bankCode, accountNumber string) error
}

type FundSourceFactory struct {
	verifier BankAccountVerifier
}

func NewFundSourceFactory(verifier BankAccountVerifier) (*FundSourceFactory, error) {
	if verifier == nil {
		return nil, errors.New("verifier can't be nil")
	}

	return &FundSourceFactory{
		verifier,
	}, nil
}

func (f *FundSourceFactory) CreateFundSource(
	name string,
	startBalance decimal.Decimal,
	currency shared.Currency,
	details FundSourceDetails,
) (*FundSource, error) {
	name = strings.TrimSpace(name)

	var errDetails []common.ErrorDetails
	if name == "" {
		errDetails = append(errDetails, common.ErrorDetails{
			EntityType: "FundSource",
			ErrorSlug:  "name-required",
			Message:    "fund source name is required",
		})
	}
	if startBalance.IsNegative() {
		errDetails = append(errDetails, common.ErrorDetails{
			EntityType: "FundSource",
			ErrorSlug:  "start-balance-negative",
			Message:    "start balance can't be negative",
		})
	}
	if currency.IsZero() {
		errDetails = append(errDetails, common.ErrorDetails{
			EntityType: "FundSource",
			ErrorSlug:  "currency-required",
			Message:    "currency is required",
		})
	}
	if details == nil {
		errDetails = append(errDetails, common.ErrorDetails{
			EntityType: "FundSource",
			ErrorSlug:  "details-required",
			Message:    "fund source details are required",
		})
	}
	if len(errDetails) > 0 {
		return nil, common.NewInvalidInputError("invalid-fund-source", "invalid fund source").WithDetails(errDetails)
	}

	return &FundSource{
		uuid:     FundSourceUUID{common.NewUUIDv7()},
		name:     name,
		balance:  startBalance,
		currency: currency,
		details:  details,
	}, nil
}

// CreateBankDetails builds bank details after verifying the account with the BankAccountVerifier.
func (f *FundSourceFactory) CreateBankDetails(
	ctx context.Context,
	bankCode string,
	bankBin int32,
	bankShortName, ownerName, accountNumber string,
) (*BankDetails, error) {
	bankCode = strings.TrimSpace(bankCode)
	bankShortName = strings.TrimSpace(bankShortName)
	ownerName = strings.TrimSpace(ownerName)
	accountNumber = strings.TrimSpace(accountNumber)

	var errDetails []common.ErrorDetails
	if bankCode == "" {
		errDetails = append(errDetails, common.ErrorDetails{
			EntityType: "BankDetails",
			ErrorSlug:  "bank-code-required",
			Message:    "bank code is required",
		})
	}
	if bankBin <= 0 {
		errDetails = append(errDetails, common.ErrorDetails{
			EntityType: "BankDetails",
			ErrorSlug:  "bank-bin-required",
			Message:    "bank bin is required and must be positive",
		})
	}
	if bankShortName == "" {
		errDetails = append(errDetails, common.ErrorDetails{
			EntityType: "BankDetails",
			ErrorSlug:  "bank-short-name-required",
			Message:    "bank short name is required",
		})
	}
	if ownerName == "" {
		errDetails = append(errDetails, common.ErrorDetails{
			EntityType: "BankDetails",
			ErrorSlug:  "owner-name-required",
			Message:    "owner name is required",
		})
	}
	if accountNumber == "" {
		errDetails = append(errDetails, common.ErrorDetails{
			EntityType: "BankDetails",
			ErrorSlug:  "account-number-required",
			Message:    "account number is required",
		})
	}
	if len(errDetails) > 0 {
		return nil, common.NewInvalidInputError("invalid-bank-details", "invalid bank details").WithDetails(errDetails)
	}

	if err := f.verifier.Verify(ctx, bankCode, accountNumber); err != nil {
		var cErr common.Error
		if errors.As(err, &cErr) {
			return nil, err
		}

		return nil, common.NewInvalidInputError("bank-account-invalid", "bank account is invalid").WithInternalError(err)
	}

	return &BankDetails{
		bankCode:      bankCode,
		bankBin:       bankBin,
		bankShortName: bankShortName,
		ownerName:     ownerName,
		accountNumber: accountNumber,
	}, nil
}

func (f *FundSourceFactory) CreateCashDetails(ownerName string) (*CashDetails, error) {
	ownerName = strings.TrimSpace(ownerName)

	var errDetails []common.ErrorDetails
	if ownerName == "" {
		errDetails = append(errDetails, common.ErrorDetails{
			EntityType: "CashDetails",
			ErrorSlug:  "owner-name-required",
			Message:    "owner name is required",
		})
	}
	if len(errDetails) > 0 {
		return nil, common.NewInvalidInputError("invalid-cash-details", "invalid cash details").WithDetails(errDetails)
	}

	return &CashDetails{ownerName: ownerName}, nil
}
