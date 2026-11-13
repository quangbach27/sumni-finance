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
)

type FundSourceStatementReadModel struct {
	db *pgxpool.Pool
}

var _ queries.FundSourceStatementReadModel = (*FundSourceStatementReadModel)(nil)

func NewFundSourceStatementReadModel(db *pgxpool.Pool) (*FundSourceStatementReadModel, error) {
	if db == nil {
		return nil, errors.New("db can't be nil")
	}

	return &FundSourceStatementReadModel{db: db}, nil
}

func (r *FundSourceStatementReadModel) ListFundSourceStatements(
	ctx context.Context,
	orgID string,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
) ([]queries.FundSourceStatement, error) {
	q := dbmodels.New(r.db)

	if _, err := q.GetLedgerPeriodByUUID(ctx, dbmodels.GetLedgerPeriodByUUIDParams{OrgID: orgID, Uuid: ledgerPeriodUUID}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, common.NewNotFoundError("ledger-period-not-found", "ledger period %s was not found", ledgerPeriodUUID.String())
		}

		return nil, fmt.Errorf("get ledger period: %w", err)
	}

	rows, err := q.ListFundSourceStatementsByPeriod(ctx, ledgerPeriodUUID)
	if err != nil {
		return nil, fmt.Errorf("list fund source statements: %w", err)
	}

	items := make([]queries.FundSourceStatement, 0, len(rows))
	for _, row := range rows {
		items = append(items, queries.FundSourceStatement{
			UUID:           row.Uuid.String(),
			FundSourceUUID: row.FundSourceUuid.String(),
			OpeningBalance: row.OpeningBalance,
			ClosingBalance: row.ClosingBalance,
			ActualBalance:  row.ActualBalance,
			ReconciledBy:   row.ReconciledBy,
			ReconciledAt:   row.ReconciledAt,
		})
	}

	return items, nil
}
