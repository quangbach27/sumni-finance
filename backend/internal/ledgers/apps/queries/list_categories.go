package queries

import (
	"context"

	"github.com/quangbach27/golang-common/http/auth"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/shared"
)

type ListCategories struct {
	Session *auth.Session
}

func (h *Handlers) ListCategories(ctx context.Context, q ListCategories) ([]Category, error) {
	res, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  q.Session,
		Resource: shared.ResourceLedgerCategory,
		Action:   shared.ActionRead,
	})
	if err != nil {
		return nil, err
	}

	return h.categoryReadModel.ListCategories(ctx, res.OrgID)
}
