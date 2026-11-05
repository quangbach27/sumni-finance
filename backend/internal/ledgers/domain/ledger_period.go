package domain

import (
	"strings"
	"time"

	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
)

type LedgerPeriodUUID struct {
	common.UUID
}

type LedgerStatus struct {
	common.Enum[LedgerStatusValue]
}

type LedgerStatusValue string

func (v LedgerStatusValue) Values() []string {
	return []string{"opened", "closed", "reconciled"}
}

var (
	LedgerStatusOpened     = common.MustEnum[LedgerStatus]("opened")
	LedgerStatusClosed     = common.MustEnum[LedgerStatus]("closed")
	LedgerStatusReconciled = common.MustEnum[LedgerStatus]("reconciled")
)

// LedgerPeriod is a book covering openDate..closeDate. Per-fund-source
// balances live in FundSourceStatement; combining them is the service's job.
type LedgerPeriod struct {
	uuid LedgerPeriodUUID
	name string

	openingBalance decimal.Decimal

	// set when the period is reconciled
	closingBalance *decimal.Decimal

	openDate  time.Time
	closeDate time.Time

	status LedgerStatus

	reopenReason *string
	reopenedAt   *time.Time
	reconciledAt *time.Time
}

func NewLedgerPeriod(
	name string,
	openingBalance decimal.Decimal,
	openDate, closeDate time.Time,
) (*LedgerPeriod, error) {
	name = strings.TrimSpace(name)

	var errDetails []common.ErrorDetails
	add := func(slug, msg string) {
		errDetails = append(errDetails, common.ErrorDetails{
			EntityType: "LedgerPeriod",
			ErrorSlug:  slug,
			Message:    msg,
		})
	}

	if name == "" {
		add("name-required", "name is required")
	}
	if openingBalance.IsNegative() {
		add("opening-balance-negative", "opening balance must not be negative")
	}
	if openDate.IsZero() {
		add("open-date-required", "open date is required")
	}
	if closeDate.IsZero() {
		add("close-date-required", "close date is required")
	}
	if !openDate.IsZero() && !closeDate.IsZero() && closeDate.Before(openDate) {
		add("close-date-before-open-date", "close date must not be before open date")
	}
	if len(errDetails) > 0 {
		return nil, common.NewInvalidInputError("invalid-ledger-period", "invalid ledger period").WithDetails(errDetails)
	}

	return &LedgerPeriod{
		uuid:           LedgerPeriodUUID{common.NewUUIDv7()},
		name:           name,
		openingBalance: openingBalance,
		openDate:       openDate,
		closeDate:      closeDate,
		status:         LedgerStatusOpened,
	}, nil
}

func (p *LedgerPeriod) UUID() LedgerPeriodUUID           { return p.uuid }
func (p *LedgerPeriod) Name() string                     { return p.name }
func (p *LedgerPeriod) OpeningBalance() decimal.Decimal  { return p.openingBalance }
func (p *LedgerPeriod) ClosingBalance() *decimal.Decimal { return p.closingBalance }
func (p *LedgerPeriod) OpenDate() time.Time              { return p.openDate }
func (p *LedgerPeriod) CloseDate() time.Time             { return p.closeDate }
func (p *LedgerPeriod) Status() LedgerStatus             { return p.status }
func (p *LedgerPeriod) ReopenReason() *string            { return p.reopenReason }
func (p *LedgerPeriod) ReopenedAt() *time.Time           { return p.reopenedAt }
func (p *LedgerPeriod) ReconciledAt() *time.Time         { return p.reconciledAt }

func (p *LedgerPeriod) IsOpened() bool     { return p.status.Equal(LedgerStatusOpened.Enum) }
func (p *LedgerPeriod) IsClosed() bool     { return p.status.Equal(LedgerStatusClosed.Enum) }
func (p *LedgerPeriod) IsReconciled() bool { return p.status.Equal(LedgerStatusReconciled.Enum) }

// CanPostEntries reports whether new ledger entries may be posted to the period.
func (p *LedgerPeriod) CanPostEntries() bool { return p.IsOpened() }

func errPeriodLocked() error {
	return common.NewInvalidInputError("period-locked", "ledger period is reconciled and locked")
}

// Close moves an opened period to closed.
func (p *LedgerPeriod) Close() error {
	if p.IsReconciled() {
		return errPeriodLocked()
	}
	if !p.IsOpened() {
		return common.NewInvalidInputError("period-not-open", "ledger period is not open")
	}

	p.status = LedgerStatusClosed

	return nil
}

// Reopen moves a closed period back to opened so entries can be fixed.
func (p *LedgerPeriod) Reopen(reason string) error {
	reason = strings.TrimSpace(reason)

	if p.IsReconciled() {
		return errPeriodLocked()
	}
	if !p.IsClosed() {
		return common.NewInvalidInputError("period-not-closed", "ledger period is not closed")
	}
	if reason == "" {
		return common.NewInvalidInputError("reopen-reason-required", "reopen reason is required")
	}

	now := time.Now().UTC()
	p.status = LedgerStatusOpened
	p.reopenReason = &reason
	p.reopenedAt = &now

	return nil
}

// Reconcile locks a closed period and records its closing balance. The caller
// must first confirm that every FundSourceStatement of the period is reconciled
// and pass the total of their closing balances.
func (p *LedgerPeriod) Reconcile(closingBalance decimal.Decimal) error {
	if p.IsReconciled() {
		return errPeriodLocked()
	}
	if !p.IsClosed() {
		return common.NewInvalidInputError("period-not-closed", "ledger period is not closed")
	}
	if closingBalance.IsNegative() {
		return common.NewInvalidInputError("closing-balance-negative", "closing balance must not be negative")
	}

	now := time.Now().UTC()
	p.status = LedgerStatusReconciled
	p.closingBalance = &closingBalance
	p.reconciledAt = &now

	return nil
}
