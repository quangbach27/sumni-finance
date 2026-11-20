package queries

import (
	"context"

	"github.com/quangbach27/golang-common/http/auth"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type GetFundSource struct {
	Session        *auth.Session
	FundSourceUUID domain.FundSourceUUID
}

func (h *Handlers) GetFundSource(ctx context.Context, query GetFundSource) (FundSourceDetail, error) {
	principal, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  query.Session,
		Resource: shared.ResourceFundSource,
		Action:   shared.ActionRead,
	})
	if err != nil {
		return FundSourceDetail{}, err
	}

	return h.fsReadModel.GetFundSource(ctx, principal.OrgID, query.FundSourceUUID)
}
