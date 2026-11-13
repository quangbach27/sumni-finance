package queries

import "context"

type GetUnlockedLedgerPeriod struct {
	OrgID string
}

func (h *Handlers) GetUnlockedLedgerPeriod(ctx context.Context, q GetUnlockedLedgerPeriod) (LedgerPeriodDetail, error) {
	return h.periodReadModel.GetUnlockedLedgerPeriod(ctx, q.OrgID)
}
