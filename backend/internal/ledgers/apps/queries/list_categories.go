package queries

import "context"

type ListCategories struct{}

func (h *Handlers) ListCategories(ctx context.Context, _ ListCategories) ([]Category, error) {
	return h.categoryReadModel.ListCategories(ctx)
}
