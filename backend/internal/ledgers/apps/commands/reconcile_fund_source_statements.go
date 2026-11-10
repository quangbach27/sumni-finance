package commands

import (
	"context"

	"github.com/quangbach27/golang-common/log"

	"backend/internal/ledgers/domain"
)

type ReconcileFundSourceStatements struct {
	LedgerPeriodUUID domain.LedgerPeriodUUID
	ReconciledBy     string
	Statements       []domain.StatementActualBalance
}

// ReconcileFundSourceStatements compares the actual balance of each statement
// with its closing balance. The repository validates and reconciles them all
// or none.
func (h *Handlers) ReconcileFundSourceStatements(ctx context.Context, cmd ReconcileFundSourceStatements) error {
	if err := h.periodRepo.ReconcileFundSourceStatements(ctx, cmd.LedgerPeriodUUID, cmd.ReconciledBy, cmd.Statements); err != nil {
		return err
	}

	log.FromContext(ctx).With("periodUUID", cmd.LedgerPeriodUUID.String(), "statementCount", len(cmd.Statements)).Info("fund source statements reconciled")

	return nil
}
