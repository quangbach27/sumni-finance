package commands

import (
	"context"

	"github.com/quangbach27/golang-common/http/auth"
	"github.com/quangbach27/golang-common/log"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type CloseLedgerPeriod struct {
	Session          *auth.Session
	LedgerPeriodUUID domain.LedgerPeriodUUID
}

// CloseLedgerPeriod closes the period. The repository sets the closing balance
// of every fund source statement to the current fund source balance.
func (h *Handlers) CloseLedgerPeriod(ctx context.Context, cmd CloseLedgerPeriod) error {
	res, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  cmd.Session,
		Resource: shared.ResourceLedgerPeriod,
		Action:   shared.ActionUpdate,
	})
	if err != nil {
		return err
	}

	if err := h.periodRepo.CloseLedgerPeriod(ctx, res.OrgID, cmd.LedgerPeriodUUID); err != nil {
		return err
	}

	log.FromContext(ctx).With("periodUUID", cmd.LedgerPeriodUUID.String()).Info("ledger period closed")

	return nil
}
