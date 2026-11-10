package queries

import (
	"context"

	"backend/internal/ledgers/domain"
)

type ListFundSourceStatements struct {
	LedgerPeriodUUID domain.LedgerPeriodUUID
}

func (h *Handlers) ListFundSourceStatements(ctx context.Context, query ListFundSourceStatements) ([]FundSourceStatement, error) {
	return h.statementReadModel.ListFundSourceStatements(ctx, query.LedgerPeriodUUID)
}
