package domain

import (
	"time"

	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
)

type FundSourceStatementRepository interface{}

type FundSourceStatementUUID struct {
	common.UUID
}

// FundSourceStatement is one fund source's balances within a ledger period.
// It references the period by ID only.
type FundSourceStatement struct {
	uuid             FundSourceStatementUUID
	ledgerPeriodUUID LedgerPeriodUUID
	fundSourceUUID   FundSourceUUID

	openingBalance decimal.Decimal

	// closingBalance is the system balance, set when the period is closed.
	closingBalance *decimal.Decimal
	// set once reconciled
	actualBalance *decimal.Decimal
	reconciledBy  *string
	reconciledAt  *time.Time
}

func NewFundSourceStatement(
	ledgerPeriodUUID LedgerPeriodUUID,
	fundSourceUUID FundSourceUUID,
	openingBalance decimal.Decimal,
) (*FundSourceStatement, error) {
	var errDetails []common.ErrorDetails
	add := func(slug, msg string) {
		errDetails = append(errDetails, common.ErrorDetails{
			EntityType: "FundSourceStatement",
			ErrorSlug:  slug,
			Message:    msg,
		})
	}

	if ledgerPeriodUUID.IsZero() {
		add("ledger-period-required", "ledger period is required")
	}
	if fundSourceUUID.IsZero() {
		add("fund-source-required", "fund source is required")
	}
	if openingBalance.IsNegative() {
		add("opening-balance-negative", "opening balance must not be negative")
	}
	if len(errDetails) > 0 {
		return nil, common.NewInvalidInputError("invalid-fund-source-statement", "invalid fund source statement").WithDetails(errDetails)
	}

	return &FundSourceStatement{
		uuid:             FundSourceStatementUUID{common.NewUUIDv7()},
		ledgerPeriodUUID: ledgerPeriodUUID,
		fundSourceUUID:   fundSourceUUID,
		openingBalance:   openingBalance,
	}, nil
}

func (s *FundSourceStatement) UUID() FundSourceStatementUUID         { return s.uuid }
func (s *FundSourceStatement) LedgerPeriodUUID() LedgerPeriodUUID { return s.ledgerPeriodUUID }
func (s *FundSourceStatement) FundSourceUUID() FundSourceUUID     { return s.fundSourceUUID }
func (s *FundSourceStatement) OpeningBalance() decimal.Decimal    { return s.openingBalance }
func (s *FundSourceStatement) ClosingBalance() *decimal.Decimal   { return s.closingBalance }
func (s *FundSourceStatement) ActualBalance() *decimal.Decimal    { return s.actualBalance }
func (s *FundSourceStatement) ReconciledBy() *string              { return s.reconciledBy }
func (s *FundSourceStatement) ReconciledAt() *time.Time           { return s.reconciledAt }

func (s *FundSourceStatement) IsClosed() bool     { return s.closingBalance != nil }
func (s *FundSourceStatement) IsReconciled() bool { return s.reconciledAt != nil }

// Close records the system closing balance when the period is closed.
func (s *FundSourceStatement) Close(closingBalance decimal.Decimal) error {
	if s.IsReconciled() {
		return common.NewInvalidInputError("fund-source-statement-already-reconciled", "fund source statement is already reconciled")
	}
	if closingBalance.IsNegative() {
		return common.NewInvalidInputError("closing-balance-negative", "closing balance must not be negative")
	}

	s.closingBalance = &closingBalance

	return nil
}

// Reconcile compares the actual (counted) balance with the closing balance
// and records who reconciled it. On mismatch it fails with balance-mismatch
// and leaves the entity unchanged.
func (s *FundSourceStatement) Reconcile(actualBalance decimal.Decimal, reconciledBy string) error {
	if s.IsReconciled() {
		return common.NewInvalidInputError("fund-source-statement-already-reconciled", "fund source statement is already reconciled")
	}
	if !s.IsClosed() {
		return common.NewInvalidInputError("fund-source-statement-not-closed", "fund source statement must be closed before reconciling")
	}
	if reconciledBy == "" {
		return common.NewInvalidInputError("reconciled-by-required", "reconciled by is required")
	}
	if actualBalance.IsNegative() {
		return common.NewInvalidInputError("actual-balance-negative", "actual balance must not be negative")
	}
	if !s.closingBalance.Equal(actualBalance) {
		return common.NewInvalidInputError(
			"balance-mismatch",
			"actual balance differs from closing balance by %s",
			actualBalance.Sub(*s.closingBalance).String(),
		)
	}

	now := time.Now().UTC()
	s.actualBalance = &actualBalance
	s.reconciledBy = &reconciledBy
	s.reconciledAt = &now

	return nil
}
