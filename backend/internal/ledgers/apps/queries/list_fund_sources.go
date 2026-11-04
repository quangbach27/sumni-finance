package queries

import "context"

type ListFundSources struct{}

func (h *Handlers) ListFundSources(ctx context.Context, query ListFundSources) ([]FundSource, error) {
	return h.fsReadModel.ListFundSources(ctx)
}
