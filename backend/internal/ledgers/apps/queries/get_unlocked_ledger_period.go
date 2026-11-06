package queries

import "context"

type GetUnlockedLedgerPeriod struct{}

func (h *Handlers) GetUnlockedLedgerPeriod(ctx context.Context, _ GetUnlockedLedgerPeriod) (LedgerPeriodDetail, error) {
	return h.periodReadModel.GetUnlockedLedgerPeriod(ctx)
}
