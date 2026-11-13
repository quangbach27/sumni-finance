package queries

import "context"

type ListCategories struct {
	OrgID string
}

func (h *Handlers) ListCategories(ctx context.Context, q ListCategories) ([]Category, error) {
	return h.categoryReadModel.ListCategories(ctx, q.OrgID)
}
