package commands

import (
	"context"

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
	return h.periodRepo.ReconcileFundSourceStatements(ctx, cmd.LedgerPeriodUUID, cmd.ReconciledBy, cmd.Statements)
}
