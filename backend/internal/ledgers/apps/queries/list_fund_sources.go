package queries

import "context"

type ListFundSources struct {
	OrgID string
}

func (h *Handlers) ListFundSources(ctx context.Context, query ListFundSources) ([]FundSource, error) {
	return h.fsReadModel.ListFundSources(ctx, query.OrgID)
}
