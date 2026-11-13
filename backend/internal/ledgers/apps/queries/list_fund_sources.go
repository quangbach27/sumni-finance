package queries

import (
	"context"

	"github.com/quangbach27/golang-common/http/auth"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/shared"
)

type ListFundSources struct {
	Session *auth.Session
}

func (h *Handlers) ListFundSources(ctx context.Context, query ListFundSources) ([]FundSource, error) {
	res, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  query.Session,
		Resource: shared.ResourceFundSource,
		Action:   shared.ActionRead,
	})
	if err != nil {
		return nil, err
	}

	return h.fsReadModel.ListFundSources(ctx, res.OrgID)
}
