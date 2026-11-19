package queries

import (
	"context"

	"github.com/quangbach27/golang-common/http/auth"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type GetLedgerPeriod struct {
	Session          *auth.Session
	LedgerPeriodUUID domain.LedgerPeriodUUID
}

func (h *Handlers) GetLedgerPeriod(ctx context.Context, q GetLedgerPeriod) (LedgerPeriodDetail, error) {
	principal, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  q.Session,
		Resource: shared.ResourceLedgerPeriod,
		Action:   shared.ActionRead,
	})
	if err != nil {
		return LedgerPeriodDetail{}, err
	}

	return h.periodReadModel.GetLedgerPeriod(ctx, principal.OrgID, q.LedgerPeriodUUID)
}
