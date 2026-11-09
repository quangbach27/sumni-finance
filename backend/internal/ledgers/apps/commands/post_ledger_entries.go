package commands

import (
	"context"
	"errors"
	"strconv"
	"time"

	common "github.com/quangbach27/golang-common"
	"github.com/quangbach27/golang-common/log"
	"github.com/shopspring/decimal"

	"backend/internal/ledgers/apps/models"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type LedgerEntryInput struct {
	Amount       decimal.Decimal
	Direction    shared.Direction
	Description  string
	OccurredAt   time.Time
	CategoryUUID *models.CategoryUUID
}

type PostLedgerEntries struct {
	LedgerPeriodUUID domain.LedgerPeriodUUID
	FundSourceUUID   domain.FundSourceUUID
	Entries          []LedgerEntryInput
}

// PostLedgerEntries posts many entries of one period to one fund source at once.
// The fund source must belong to the period. Every entry is applied to it
// (inflow tops up, outflow withdraws) and records the fund source balance
// before and after. All entries are posted or none is.
// It returns the new entry UUIDs in the order of cmd.Entries.
func (h *Handlers) PostLedgerEntries(ctx context.Context, cmd PostLedgerEntries) ([]domain.LedgerEntryUUID, error) {
	if len(cmd.Entries) == 0 {
		return nil, common.NewInvalidInputError("entries-required", "at least one ledger entry is required")
	}

	if cmd.FundSourceUUID == (domain.FundSourceUUID{}) {
		return nil, common.NewInvalidInputError("fund-source-required", "fund source is required")
	}

	// Validate the whole batch before touching the database.
	if _, err := buildLedgerEntries(cmd); err != nil {
		return nil, err
	}

	var entryUUIDs []domain.LedgerEntryUUID

	err := h.periodRepo.PostJournalEntries(
		ctx,
		cmd.LedgerPeriodUUID,
		[]domain.FundSourceUUID{cmd.FundSourceUUID},
		func(period *domain.LedgerPeriod, fundSources map[domain.FundSourceUUID]*domain.FundSource) ([]*domain.LedgerEntry, error) {
			if !period.CanPostEntries() {
				return nil, common.NewConflictError("period-not-open", "ledger period %s does not accept entries", period.UUID().String())
			}

			// postFn can run again when the transaction is retried, so build the
			// entries here on every call instead of reusing them.
			entries, err := buildLedgerEntries(cmd)
			if err != nil {
				return nil, err
			}

			fs, ok := fundSources[cmd.FundSourceUUID]
			if !ok {
				return nil, common.NewNotFoundError("fund-source-not-found", "fund source %s was not found", cmd.FundSourceUUID.String())
			}

			for _, entry := range entries {
				var snapshot domain.FundSourceSnapshot
				if entry.IsInflow() {
					snapshot, err = fs.TopUp(entry.Amount())
				} else {
					snapshot, err = fs.Withdraw(entry.Amount())
				}
				if err != nil {
					return nil, err
				}

				if err := entry.RecordFundSourceSnapshot(snapshot); err != nil {
					return nil, err
				}
			}

			entryUUIDs = make([]domain.LedgerEntryUUID, 0, len(entries))
			for _, entry := range entries {
				entryUUIDs = append(entryUUIDs, entry.UUID())
			}

			return entries, nil
		},
	)
	if err != nil {
		return nil, err
	}

	log.FromContext(ctx).With("periodUUID", cmd.LedgerPeriodUUID.String(), "entryCount", len(entryUUIDs)).Info("journal entries posted")

	return entryUUIDs, nil
}

// buildLedgerEntries creates the entries of the command. Validation failures of
// all entries are returned together, each detail tagged with the entry index.
func buildLedgerEntries(cmd PostLedgerEntries) ([]*domain.LedgerEntry, error) {
	entries := make([]*domain.LedgerEntry, 0, len(cmd.Entries))

	var details []common.ErrorDetails

	for i, in := range cmd.Entries {
		entry, err := domain.NewLedgerEntry(
			cmd.LedgerPeriodUUID,
			cmd.FundSourceUUID,
			in.Amount,
			in.Direction,
			in.Description,
			in.OccurredAt,
			in.CategoryUUID,
		)
		if err != nil {
			var cerr common.Error
			if !errors.As(err, &cerr) {
				return nil, err
			}

			for _, d := range cerr.Details {
				d.EntityID = strconv.Itoa(i)
				details = append(details, d)
			}

			continue
		}

		entries = append(entries, entry)
	}

	if len(details) > 0 {
		return nil, common.NewInvalidInputError("invalid-ledger-entries", "invalid ledger entries").WithDetails(details)
	}

	return entries, nil
}
