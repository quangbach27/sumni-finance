package commands

import (
	"context"

	"github.com/quangbach27/golang-common/log"

	"backend/internal/ledgers/domain"
)

type ReopenLedgerPeriod struct {
	LedgerPeriodUUID domain.LedgerPeriodUUID
	Reason           string
}

// ReopenLedgerPeriod reopens a closed period. The repository clears the closing
// balance of its fund source statements.
func (h *Handlers) ReopenLedgerPeriod(ctx context.Context, cmd ReopenLedgerPeriod) error {
	if err := h.periodRepo.ReopenLedgerPeriod(ctx, cmd.LedgerPeriodUUID, cmd.Reason); err != nil {
		return err
	}

	log.FromContext(ctx).With("periodUUID", cmd.LedgerPeriodUUID.String()).Info("ledger period reopened")

	return nil
}
