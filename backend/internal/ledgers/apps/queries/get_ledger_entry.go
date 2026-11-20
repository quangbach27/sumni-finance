package queries

import (
	"context"

	"github.com/quangbach27/golang-common/http/auth"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type GetLedgerEntry struct {
	Session         *auth.Session
	LedgerEntryUUID domain.LedgerEntryUUID
}

func (h *Handlers) GetLedgerEntry(ctx context.Context, query GetLedgerEntry) (LedgerEntryListItem, error) {
	principal, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  query.Session,
		Resource: shared.ResourceFundSource,
		Action:   shared.ActionRead,
	})
	if err != nil {
		return LedgerEntryListItem{}, err
	}

	return h.entryReadModel.GetLedgerEntry(ctx, principal.OrgID, query.LedgerEntryUUID)
}
