package commands

import (
	"context"

	"backend/internal/ledgers/domain"
)

type ReconcileLedgerPeriod struct {
	LedgerPeriodUUID domain.LedgerPeriodUUID
}

// ReconcileLedgerPeriod locks a closed period once every fund source statement
// is reconciled. The repository checks the statements and sets the closing
// balance.
func (h *Handlers) ReconcileLedgerPeriod(ctx context.Context, cmd ReconcileLedgerPeriod) error {
	return h.periodRepo.ReconcileLedgerPeriod(ctx, cmd.LedgerPeriodUUID)
}
