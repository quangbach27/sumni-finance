package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	common "github.com/quangbach27/golang-common"

	"backend/internal/ledgers/adapters/db/dbmodels"
	"backend/internal/ledgers/apps/queries"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type LedgerEntryReadModel struct {
	db *pgxpool.Pool
}

var _ queries.LedgerEntryReadModel = (*LedgerEntryReadModel)(nil)

func NewLedgerEntryReadModel(db *pgxpool.Pool) (*LedgerEntryReadModel, error) {
	if db == nil {
		return nil, errors.New("db can't be nil")
	}

	return &LedgerEntryReadModel{db: db}, nil
}

func (r *LedgerEntryReadModel) ListLedgerEntries(
	ctx context.Context,
	orgID string,
	query queries.ListLedgerEntries,
) (shared.PagedResult[queries.LedgerEntryListItem], error) {
	var periodUUID, fundSourceUUID, categoryUUID *common.UUID
	if query.LedgerPeriodUUID != nil {
		periodUUID = &query.LedgerPeriodUUID.UUID
	}

	if query.FundSourceUUID != nil {
		fundSourceUUID = &query.FundSourceUUID.UUID
	}

	if query.CategoryUUID != nil {
		categoryUUID = &query.CategoryUUID.UUID
	}

	var kind *string
	if query.Kind != nil {
		k := query.Kind.String()
		kind = &k
	}

	var status *string
	if query.Status != nil {
		s := query.Status.String()
		status = &s
	}

	q := dbmodels.New(r.db)

	total, err := q.CountLedgerEntries(ctx, dbmodels.CountLedgerEntriesParams{
		OrgID:            orgID,
		Kind:             kind,
		Status:           status,
		LedgerPeriodUuid: periodUUID,
		FundSourceUuid:   fundSourceUUID,
		CategoryUuid:     categoryUUID,
		FromDate:         query.FromDate,
		ToDate:           query.ToDate,
	})
	if err != nil {
		return shared.PagedResult[queries.LedgerEntryListItem]{}, fmt.Errorf("count ledger entries: %w", err)
	}

	rows, err := q.ListLedgerEntries(ctx, dbmodels.ListLedgerEntriesParams{
		OrgID:            orgID,
		Kind:             kind,
		Status:           status,
		LedgerPeriodUuid: periodUUID,
		FundSourceUuid:   fundSourceUUID,
		CategoryUuid:     categoryUUID,
		FromDate:         query.FromDate,
		ToDate:           query.ToDate,
		PageLimit:        int32(query.Page.Limit()),
		PageOffset:       int32(query.Page.Offset()),
	})
	if err != nil {
		return shared.PagedResult[queries.LedgerEntryListItem]{}, fmt.Errorf("list ledger entries: %w", err)
	}

	items := make([]queries.LedgerEntryListItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, toLedgerEntryListItem(dbmodels.GetLedgerEntryRow(row)))
	}

	return shared.NewPagedResult(items, query.Page, int(total)), nil
}

func (r *LedgerEntryReadModel) GetLedgerEntry(
	ctx context.Context,
	orgID string,
	ledgerEntryUUID domain.LedgerEntryUUID,
) (queries.LedgerEntryListItem, error) {
	row, err := dbmodels.New(r.db).GetLedgerEntry(ctx, dbmodels.GetLedgerEntryParams{OrgID: orgID, Uuid: ledgerEntryUUID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return queries.LedgerEntryListItem{}, common.NewNotFoundError("ledger-entry-not-found", "ledger entry %s was not found", ledgerEntryUUID.String())
		}

		return queries.LedgerEntryListItem{}, fmt.Errorf("get ledger entry: %w", err)
	}

	return toLedgerEntryListItem(row), nil
}

// toLedgerEntryListItem maps a get row. sqlc emits one struct per query and
// ListLedgerEntriesRow has identical fields, so list rows are converted to it.
func toLedgerEntryListItem(row dbmodels.GetLedgerEntryRow) queries.LedgerEntryListItem {
	item := queries.LedgerEntryListItem{
		UUID: row.Uuid.String(),
		LedgerPeriod: queries.LedgerEntryPeriod{
			UUID:   row.LedgerPeriodUuid.String(),
			Name:   row.PeriodName,
			Status: row.PeriodStatus.String(),
		},
		FundSource: queries.LedgerEntryFundSource{
			UUID:          row.FundSourceUuid.String(),
			Name:          row.FundSourceName,
			BankCode:      row.FundSourceBankCode,
			AccountNumber: row.FundSourceAccountNumber,
		},
		OccurredAt:          row.OccurredAt,
		Description:         row.Description,
		Direction:           row.Direction.String(),
		Amount:              row.Amount,
		BalanceBefore:       row.FsBalanceBefore,
		BalanceAfter:        row.FsBalanceAfter,
		Status:              row.Status,
		Kind:                row.Kind,
		CreatedAt:           row.CreatedAt,
		CreatedBy:           row.CreatedBy,
		ReversedByEntryUUID: uuidPtrToString(row.ReversedByEntryUuid),
		VoidedReason:        row.VoidedReason,
		VoidedBy:            row.VoidedBy,
		VoidedAt:            row.VoidedAt,
	}

	// A tag is a sub-category: the parent is the category, the entry's own
	// category is the tag.
	own := &queries.CategoryRef{UUID: row.CategoryUuid.String(), Name: row.EntryCategoryName}
	if row.ParentCategoryUuid != nil && row.ParentCategoryName != nil {
		item.Category = &queries.CategoryRef{UUID: row.ParentCategoryUuid.String(), Name: *row.ParentCategoryName}
		item.Tag = own
	} else {
		item.Category = own
	}

	return item
}
