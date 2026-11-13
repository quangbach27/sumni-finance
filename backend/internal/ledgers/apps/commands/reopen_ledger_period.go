package commands

import (
	"context"

	"github.com/quangbach27/golang-common/http/auth"
	"github.com/quangbach27/golang-common/log"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type ReopenLedgerPeriod struct {
	Session          *auth.Session
	LedgerPeriodUUID domain.LedgerPeriodUUID
	Reason           string
}

// ReopenLedgerPeriod reopens a closed period. The repository clears the closing
// balance of its fund source statements.
func (h *Handlers) ReopenLedgerPeriod(ctx context.Context, cmd ReopenLedgerPeriod) error {
	res, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  cmd.Session,
		Resource: shared.ResourceLedgerPeriod,
		Action:   shared.ActionUpdate,
	})
	if err != nil {
		return err
	}

	if err := h.periodRepo.ReopenLedgerPeriod(ctx, res.OrgID, cmd.LedgerPeriodUUID, cmd.Reason); err != nil {
		return err
	}

	log.FromContext(ctx).With("periodUUID", cmd.LedgerPeriodUUID.String()).Info("ledger period reopened")

	return nil
}
