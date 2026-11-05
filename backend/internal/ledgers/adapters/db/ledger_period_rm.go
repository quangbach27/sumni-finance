package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"backend/internal/ledgers/adapters/db/dbmodels"
	"backend/internal/ledgers/apps/queries"
	"backend/internal/shared"
)

type LedgerPeriodReadModel struct {
	db *pgxpool.Pool
}

var _ queries.LedgerPeriodReadModel = (*LedgerPeriodReadModel)(nil)

func NewLedgerPeriodReadModel(db *pgxpool.Pool) (*LedgerPeriodReadModel, error) {
	if db == nil {
		return nil, errors.New("db can't be nil")
	}

	return &LedgerPeriodReadModel{db: db}, nil
}

func (r *LedgerPeriodReadModel) ListLedgerPeriods(
	ctx context.Context,
	query queries.ListLedgerPeriods,
) (shared.PagedResult[queries.LedgerPeriod], error) {
	var status *string
	if query.Status != nil {
		s := query.Status.String()
		status = &s
	}

	q := dbmodels.New(r.db)

	total, err := q.CountLedgerPeriods(ctx, status)
	if err != nil {
		return shared.PagedResult[queries.LedgerPeriod]{}, fmt.Errorf("count ledger periods: %w", err)
	}

	rows, err := q.ListLedgerPeriods(ctx, dbmodels.ListLedgerPeriodsParams{
		Status:     status,
		PageLimit:  int32(query.Page.Limit()),
		PageOffset: int32(query.Page.Offset()),
	})
	if err != nil {
		return shared.PagedResult[queries.LedgerPeriod]{}, fmt.Errorf("list ledger periods: %w", err)
	}

	items := make([]queries.LedgerPeriod, 0, len(rows))
	for _, row := range rows {
		items = append(items, queries.LedgerPeriod{
			UUID:           row.Uuid.String(),
			Name:           row.Name,
			OpeningBalance: row.OpeningBalance,
			ClosingBalance: row.ClosingBalance,
			OpenDate:       row.OpenDate,
			CloseDate:      row.CloseDate,
			Status:         row.Status.String(),
			ReopenReason:   row.ReopenReason,
			ReopenedAt:     row.ReopenedAt,
			ReconciledAt:   row.ReconciledAt,
		})
	}

	return shared.NewPagedResult(items, query.Page, int(total)), nil
}
