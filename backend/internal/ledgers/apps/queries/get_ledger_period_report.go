package queries

import (
	"context"

	"github.com/quangbach27/golang-common/http/auth"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/apps/models"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type GetLedgerPeriodReport struct {
	Session    *auth.Session
	ReportUUID domain.ReportUUID
}

// GetLedgerPeriodReport returns the stored report of a period.
func (h *Handlers) GetLedgerPeriodReport(ctx context.Context, q GetLedgerPeriodReport) (models.ReportSnapshot, error) {
	principal, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  q.Session,
		Resource: shared.ResourceLedgerPeriod,
		Action:   shared.ActionRead,
	})
	if err != nil {
		return models.ReportSnapshot{}, err
	}

	return h.periodReadModel.GetLedgerPeriodReport(ctx, principal.OrgID, q.ReportUUID)
}
