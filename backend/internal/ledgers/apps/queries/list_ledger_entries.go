package queries

import (
	"context"
	"time"

	"github.com/quangbach27/golang-common/http/auth"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type ListLedgerEntries struct {
	Session          *auth.Session
	LedgerPeriodUUID *domain.LedgerPeriodUUID // nil = all periods
	FundSourceUUID   *domain.FundSourceUUID   // nil = all fund sources
	CategoryUUID     *domain.CategoryUUID     // matches the category and its sub-categories
	Kind             *domain.EntryKind        // nil = both
	Status           *domain.EntryStatus      // nil = both posted and voided
	FromDate         *time.Time
	ToDate           *time.Time
	Page             shared.PageRequest
}

func (h *Handlers) ListLedgerEntries(ctx context.Context, query ListLedgerEntries) (shared.PagedResult[LedgerEntryListItem], error) {
	principal, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  query.Session,
		Resource: shared.ResourceFundSource,
		Action:   shared.ActionRead,
	})
	if err != nil {
		return shared.PagedResult[LedgerEntryListItem]{}, err
	}

	return h.entryReadModel.ListLedgerEntries(ctx, principal.OrgID, query)
}
