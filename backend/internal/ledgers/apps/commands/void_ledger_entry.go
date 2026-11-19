package commands

import (
	"context"

	common "github.com/quangbach27/golang-common"
	"github.com/quangbach27/golang-common/http/auth"
	"github.com/quangbach27/golang-common/log"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type VoidLedgerEntry struct {
	Session         *auth.Session
	LedgerEntryUUID domain.LedgerEntryUUID
	Reason          string
}

// VoidLedgerEntry voids an entry by posting a reversal that restores the fund
// source balance. The repository checks that the entry's period is open.
func (h *Handlers) VoidLedgerEntry(ctx context.Context, cmd VoidLedgerEntry) error {
	if cmd.LedgerEntryUUID.IsZero() {
		return common.NewInvalidInputError("ledger-entry-required", "ledger entry is required")
	}

	principal, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  cmd.Session,
		Resource: shared.ResourceLedgerEntry,
		Action:   shared.ActionUpdate,
	})
	if err != nil {
		return err
	}

	if err := h.periodRepo.VoidJournalEntry(ctx, principal.OrgID, cmd.LedgerEntryUUID, cmd.Reason, principal.UserID); err != nil {
		return err
	}

	log.FromContext(ctx).With("entryUUID", cmd.LedgerEntryUUID.String()).Info("ledger entry voided")

	return nil
}
