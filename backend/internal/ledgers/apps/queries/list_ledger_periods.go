package queries

import (
	"context"

	"github.com/quangbach27/golang-common/http/auth"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type ListLedgerPeriods struct {
	Session *auth.Session
	Page    shared.PageRequest
	Status  *domain.LedgerStatus // nil = any status
}

func (h *Handlers) ListLedgerPeriods(ctx context.Context, query ListLedgerPeriods) (shared.PagedResult[LedgerPeriod], error) {
	res, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  query.Session,
		Resource: shared.ResourceLedgerPeriod,
		Action:   shared.ActionRead,
	})
	if err != nil {
		return shared.PagedResult[LedgerPeriod]{}, err
	}

	return h.periodReadModel.ListLedgerPeriods(ctx, res.OrgID, query)
}
