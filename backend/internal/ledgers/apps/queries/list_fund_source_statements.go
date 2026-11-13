package queries

import (
	"context"

	"github.com/quangbach27/golang-common/http/auth"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type ListFundSourceStatements struct {
	Session          *auth.Session
	LedgerPeriodUUID domain.LedgerPeriodUUID
}

func (h *Handlers) ListFundSourceStatements(ctx context.Context, query ListFundSourceStatements) ([]FundSourceStatement, error) {
	res, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  query.Session,
		Resource: shared.ResourceFundSource,
		Action:   shared.ActionRead,
	})
	if err != nil {
		return nil, err
	}

	return h.statementReadModel.ListFundSourceStatements(ctx, res.OrgID, query.LedgerPeriodUUID)
}
