package commands

import (
	"context"

	"github.com/quangbach27/golang-common/log"

	"backend/internal/ledgers/domain"
)

type ReconcileLedgerPeriod struct {
	OrgID            string
	LedgerPeriodUUID domain.LedgerPeriodUUID
}

// ReconcileLedgerPeriod locks a closed period once every fund source statement
// is reconciled. The repository checks the statements and sets the closing
// balance.
func (h *Handlers) ReconcileLedgerPeriod(ctx context.Context, cmd ReconcileLedgerPeriod) error {
	if err := h.periodRepo.ReconcileLedgerPeriod(ctx, cmd.OrgID, cmd.LedgerPeriodUUID); err != nil {
		return err
	}

	log.FromContext(ctx).With("periodUUID", cmd.LedgerPeriodUUID.String()).Info("ledger period reconciled")

	return nil
}
