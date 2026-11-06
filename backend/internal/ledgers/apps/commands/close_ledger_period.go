package commands

import (
	"context"

	"backend/internal/ledgers/domain"
)

type CloseLedgerPeriod struct {
	LedgerPeriodUUID domain.LedgerPeriodUUID
}

// CloseLedgerPeriod closes the period. The repository sets the closing balance
// of every fund source statement to the current fund source balance.
func (h *Handlers) CloseLedgerPeriod(ctx context.Context, cmd CloseLedgerPeriod) error {
	return h.periodRepo.CloseLedgerPeriod(ctx, cmd.LedgerPeriodUUID)
}
