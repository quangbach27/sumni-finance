package domain

import (
	"strings"
	"time"

	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"

	"backend/internal/shared"
)

type LedgerEntryUUID struct {
	common.UUID
}

type EntryStatus struct {
	common.Enum[EntryStatusValue]
}

type EntryStatusValue string

func (v EntryStatusValue) Values() []string {
	return []string{"posted", "voided"}
}

var (
	EntryStatusPosted = common.MustEnum[EntryStatus]("posted")
	EntryStatusVoided = common.MustEnum[EntryStatus]("voided")
)

type EntryKind struct {
	common.Enum[EntryKindValue]
}

type EntryKindValue string

func (v EntryKindValue) Values() []string {
	return []string{"normal", "reversal"}
}

var (
	EntryKindNormal   = common.MustEnum[EntryKind]("normal")
	EntryKindReversal = common.MustEnum[EntryKind]("reversal")
)

type LedgerEntry struct {
	uuid             LedgerEntryUUID
	ledgerPeriodUUID LedgerPeriodUUID
	fundSourceUUID   FundSourceUUID

	amount      decimal.Decimal
	direction   shared.Direction
	description string
	occurredAt  time.Time

	categoryUUID *CategoryUUID

	// fund source balance around this entry, recorded when the entry is
	// applied to the fund source
	fsBalanceBefore           decimal.Decimal
	fsBalanceAfter            decimal.Decimal
	fsBalanceSnapshotRecorded bool

	status EntryStatus
	kind   EntryKind

	// set on the original entry once it is voided
	reversedByEntryID *LedgerEntryUUID
	voidedReason      *string
	voidedBy          *string
	voidedAt          *time.Time

	// set on the reversal entry
	reversesEntryID *LedgerEntryUUID
}

func NewLedgerEntry(
	ledgerPeriodUUID LedgerPeriodUUID,
	fundSourceUUID FundSourceUUID,
	amount decimal.Decimal,
	direction shared.Direction,
	description string,
	occurredAt time.Time,
	categoryUUID *CategoryUUID,
) (*LedgerEntry, error) {
	description = strings.TrimSpace(description)

	var errDetails []common.ErrorDetails
	add := func(slug, msg string) {
		errDetails = append(errDetails, common.ErrorDetails{
			EntityType: "LedgerEntry",
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
	if !amount.IsPositive() {
		add("amount-must-be-positive", "amount must be positive")
	}
	if direction.IsZero() {
		add("direction-required", "direction is required")
	}
	if description == "" {
		add("description-required", "description is required")
	}
	if occurredAt.IsZero() {
		add("occurred-at-required", "occurred at is required")
	}
	if len(errDetails) > 0 {
		return nil, common.NewInvalidInputError("invalid-ledger-entry", "invalid ledger entry").WithDetails(errDetails)
	}

	return &LedgerEntry{
		uuid:             LedgerEntryUUID{common.NewUUIDv7()},
		ledgerPeriodUUID: ledgerPeriodUUID,
		fundSourceUUID:   fundSourceUUID,
		amount:           amount,
		direction:        direction,
		description:      description,
		occurredAt:       occurredAt,
		categoryUUID:     categoryUUID,
		status:           EntryStatusPosted,
		kind:             EntryKindNormal,
	}, nil
}

func (e *LedgerEntry) UUID() LedgerEntryUUID               { return e.uuid }
func (e *LedgerEntry) LedgerPeriodUUID() LedgerPeriodUUID  { return e.ledgerPeriodUUID }
func (e *LedgerEntry) FundSourceUUID() FundSourceUUID      { return e.fundSourceUUID }
func (e *LedgerEntry) Amount() decimal.Decimal             { return e.amount }
func (e *LedgerEntry) Direction() shared.Direction         { return e.direction }
func (e *LedgerEntry) Description() string                 { return e.description }
func (e *LedgerEntry) OccurredAt() time.Time               { return e.occurredAt }
func (e *LedgerEntry) CategoryUUID() *CategoryUUID         { return e.categoryUUID }
func (e *LedgerEntry) Status() EntryStatus                 { return e.status }
func (e *LedgerEntry) Kind() EntryKind                     { return e.kind }
func (e *LedgerEntry) ReversedByEntryID() *LedgerEntryUUID { return e.reversedByEntryID }
func (e *LedgerEntry) ReversesEntryID() *LedgerEntryUUID   { return e.reversesEntryID }
func (e *LedgerEntry) VoidedReason() *string               { return e.voidedReason }
func (e *LedgerEntry) VoidedBy() *string                   { return e.voidedBy }
func (e *LedgerEntry) VoidedAt() *time.Time                { return e.voidedAt }

func (e *LedgerEntry) FundSourceBalanceBefore() decimal.Decimal { return e.fsBalanceBefore }
func (e *LedgerEntry) FundSourceBalanceAfter() decimal.Decimal  { return e.fsBalanceAfter }

// HasFundSourceSnapshot reports whether the fund source balance snapshot was recorded.
func (e *LedgerEntry) HasFundSourceSnapshot() bool { return e.fsBalanceSnapshotRecorded }

// RecordFundSourceSnapshot stores the fund source balance before and after this
// entry was applied. It can be recorded once, and only for the entry's own fund source.
func (e *LedgerEntry) RecordFundSourceSnapshot(snapshot FundSourceSnapshot) error {
	if e.fsBalanceSnapshotRecorded {
		return common.NewInvalidInputError("fund-source-snapshot-already-recorded", "fund source snapshot is already recorded")
	}
	if snapshot.FundSourceUUID != e.fundSourceUUID {
		return common.NewInvalidInputError("snapshot-fund-source-mismatch", "snapshot belongs to a different fund source")
	}

	e.fsBalanceBefore = snapshot.Balance
	e.fsBalanceAfter = snapshot.BalanceAfter
	e.fsBalanceSnapshotRecorded = true

	return nil
}

func (e *LedgerEntry) IsInflow() bool  { return e.direction.Equal(shared.DirectionInflow.Enum) }
func (e *LedgerEntry) IsOutflow() bool { return e.direction.Equal(shared.DirectionOutflow.Enum) }

func (e *LedgerEntry) IsVoided() bool   { return e.status.Equal(EntryStatusVoided.Enum) }
func (e *LedgerEntry) IsReversed() bool { return e.reversedByEntryID != nil }
func (e *LedgerEntry) IsReversal() bool { return e.kind.Equal(EntryKindReversal.Enum) }

// Void marks the entry as voided and returns the reversal entry that
// compensates it. On error the entry is left unchanged.
func (e *LedgerEntry) Void(reason, voidedBy string) (*LedgerEntry, error) {
	reason = strings.TrimSpace(reason)
	voidedBy = strings.TrimSpace(voidedBy)

	if e.IsVoided() {
		return nil, common.NewInvalidInputError("ledger-entry-already-voided", "ledger entry is already voided")
	}
	if e.IsReversal() {
		return nil, common.NewInvalidInputError("reversal-entry-cannot-be-voided", "reversal entry cannot be voided")
	}

	var errDetails []common.ErrorDetails
	if reason == "" {
		errDetails = append(errDetails, common.ErrorDetails{
			EntityType: "LedgerEntry",
			ErrorSlug:  "void-reason-required",
			Message:    "void reason is required",
		})
	}
	if voidedBy == "" {
		errDetails = append(errDetails, common.ErrorDetails{
			EntityType: "LedgerEntry",
			ErrorSlug:  "voided-by-required",
			Message:    "voided by is required",
		})
	}
	if len(errDetails) > 0 {
		return nil, common.NewInvalidInputError("invalid-void", "invalid void request").WithDetails(errDetails)
	}

	now := time.Now().UTC()

	direction := shared.DirectionInflow
	if e.IsInflow() {
		direction = shared.DirectionOutflow
	}

	originalUUID := e.uuid
	reversal := &LedgerEntry{
		uuid:             LedgerEntryUUID{common.NewUUIDv7()},
		ledgerPeriodUUID: e.ledgerPeriodUUID,
		fundSourceUUID:   e.fundSourceUUID,
		amount:           e.amount,
		direction:        direction,
		description:      "Reversal of " + originalUUID.String(),
		occurredAt:       now,
		categoryUUID:     e.categoryUUID,
		status:           EntryStatusPosted,
		kind:             EntryKindReversal,
		reversesEntryID:  &originalUUID,
	}

	reversalUUID := reversal.uuid
	e.status = EntryStatusVoided
	e.voidedReason = &reason
	e.voidedBy = &voidedBy
	e.voidedAt = &now
	e.reversedByEntryID = &reversalUUID

	return reversal, nil
}
