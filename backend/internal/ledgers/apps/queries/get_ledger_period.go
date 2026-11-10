package queries

import (
	"context"

	"backend/internal/ledgers/domain"
)

type GetLedgerPeriod struct {
	LedgerPeriodUUID domain.LedgerPeriodUUID
}

func (h *Handlers) GetLedgerPeriod(ctx context.Context, q GetLedgerPeriod) (LedgerPeriodDetail, error) {
	return h.periodReadModel.GetLedgerPeriod(ctx, q.LedgerPeriodUUID)
}
