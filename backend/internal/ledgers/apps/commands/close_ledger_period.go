package commands

import (
	"context"

	"github.com/quangbach27/golang-common/log"

	"backend/internal/ledgers/domain"
)

type CloseLedgerPeriod struct {
	LedgerPeriodUUID domain.LedgerPeriodUUID
}

// CloseLedgerPeriod closes the period. The repository sets the closing balance
// of every fund source statement to the current fund source balance.
func (h *Handlers) CloseLedgerPeriod(ctx context.Context, cmd CloseLedgerPeriod) error {
	if err := h.periodRepo.CloseLedgerPeriod(ctx, cmd.LedgerPeriodUUID); err != nil {
		return err
	}

	log.FromContext(ctx).With("periodUUID", cmd.LedgerPeriodUUID.String()).Info("ledger period closed")

	return nil
}
