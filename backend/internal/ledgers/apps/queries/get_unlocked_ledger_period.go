package queries

import (
	"context"

	"github.com/quangbach27/golang-common/http/auth"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/shared"
)

type GetUnlockedLedgerPeriod struct {
	Session *auth.Session
}

func (h *Handlers) GetUnlockedLedgerPeriod(ctx context.Context, q GetUnlockedLedgerPeriod) (LedgerPeriodDetail, error) {
	res, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  q.Session,
		Resource: shared.ResourceLedgerPeriod,
		Action:   shared.ActionRead,
	})
	if err != nil {
		return LedgerPeriodDetail{}, err
	}

	return h.periodReadModel.GetUnlockedLedgerPeriod(ctx, res.OrgID)
}
