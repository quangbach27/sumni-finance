package commands

import (
	"context"

	"github.com/quangbach27/golang-common/http/auth"
	"github.com/quangbach27/golang-common/log"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type ReconcileLedgerPeriod struct {
	Session          *auth.Session
	LedgerPeriodUUID domain.LedgerPeriodUUID
}

// ReconcileLedgerPeriod locks a closed period once every fund source statement
// is reconciled. The repository checks the statements and sets the closing
// balance.
func (h *Handlers) ReconcileLedgerPeriod(ctx context.Context, cmd ReconcileLedgerPeriod) error {
	res, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  cmd.Session,
		Resource: shared.ResourceLedgerPeriod,
		Action:   shared.ActionUpdate,
	})
	if err != nil {
		return err
	}

	if err := h.periodRepo.ReconcileLedgerPeriod(ctx, res.OrgID, cmd.LedgerPeriodUUID); err != nil {
		return err
	}

	log.FromContext(ctx).With("periodUUID", cmd.LedgerPeriodUUID.String()).Info("ledger period reconciled")

	return nil
}
