package queries

import (
	"context"

	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type ListLedgerPeriods struct {
	OrgID  string
	Page   shared.PageRequest
	Status *domain.LedgerStatus // nil = any status
}

func (h *Handlers) ListLedgerPeriods(ctx context.Context, query ListLedgerPeriods) (shared.PagedResult[LedgerPeriod], error) {
	return h.periodReadModel.ListLedgerPeriods(ctx, query.OrgID, query)
}
