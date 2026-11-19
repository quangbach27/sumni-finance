package queries

import (
	"context"
	"time"

	common "github.com/quangbach27/golang-common"
	"github.com/quangbach27/golang-common/http/auth"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/apps/models"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type LedgerEntryOrderBy string

const (
	LedgerEntryOrderByOccurredAt LedgerEntryOrderBy = "occurred_at"
	LedgerEntryOrderByFundSource LedgerEntryOrderBy = "fund_source_uuid"
	LedgerEntryOrderByCategory   LedgerEntryOrderBy = "category_uuid"
)

// LedgerEntrySort is the requested ordering. An empty Field means occurred_at.
type LedgerEntrySort struct {
	Field LedgerEntryOrderBy
	Desc  bool
}

type ListLedgerEntries struct {
	Session          *auth.Session
	LedgerPeriodUUID *domain.LedgerPeriodUUID // nil = all periods
	FundSourceUUID   *domain.FundSourceUUID   // nil = all fund sources
	CategoryUUID     *models.CategoryUUID     // matches the category and its sub-categories
	Kind             *domain.EntryKind        // nil = both
	FromDate         *time.Time
	ToDate           *time.Time
	Sort             LedgerEntrySort
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

	switch query.Sort.Field {
	case "":
		query.Sort.Field = LedgerEntryOrderByOccurredAt
	case LedgerEntryOrderByOccurredAt, LedgerEntryOrderByFundSource, LedgerEntryOrderByCategory:
	default:
		return shared.PagedResult[LedgerEntryListItem]{}, common.NewInvalidInputError(
			"invalid-order-by", "unsupported order_by: %s", query.Sort.Field)
	}

	return h.entryReadModel.ListLedgerEntries(ctx, principal.OrgID, query)
}
