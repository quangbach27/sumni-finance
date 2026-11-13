package commands

import (
	"context"

	"github.com/quangbach27/golang-common/http/auth"
	"github.com/quangbach27/golang-common/log"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type ReconcileFundSourceStatements struct {
	Session          *auth.Session
	LedgerPeriodUUID domain.LedgerPeriodUUID
	Statements       []domain.StatementActualBalance
}

// ReconcileFundSourceStatements compares the actual balance of each statement
// with its closing balance. The repository validates and reconciles them all
// or none.
func (h *Handlers) ReconcileFundSourceStatements(ctx context.Context, cmd ReconcileFundSourceStatements) error {
	res, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  cmd.Session,
		Resource: shared.ResourceFundSource,
		Action:   shared.ActionUpdate,
	})
	if err != nil {
		return err
	}

	if err := h.periodRepo.ReconcileFundSourceStatements(ctx, res.OrgID, cmd.LedgerPeriodUUID, res.UserID, cmd.Statements); err != nil {
		return err
	}

	log.FromContext(ctx).With("periodUUID", cmd.LedgerPeriodUUID.String(), "statementCount", len(cmd.Statements)).Info("fund source statements reconciled")

	return nil
}
