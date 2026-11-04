package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"backend/internal/ledgers/adapters/db/dbmodels"
	"backend/internal/ledgers/apps/queries"
)

type FundSourceReadModel struct {
	db *pgxpool.Pool
}

var _ queries.FundSourceReadModel = (*FundSourceReadModel)(nil)

func NewFundSourceReadModel(db *pgxpool.Pool) (*FundSourceReadModel, error) {
	if db == nil {
		return nil, errors.New("db can't be nil")
	}

	return &FundSourceReadModel{db: db}, nil
}

func (r *FundSourceReadModel) ListFundSources(ctx context.Context) ([]queries.FundSource, error) {
	rows, err := dbmodels.New(r.db).ListFundSources(ctx)
	if err != nil {
		return nil, fmt.Errorf("list fund sources: %w", err)
	}

	fundSources := make([]queries.FundSource, 0, len(rows))
	for _, row := range rows {
		fs := queries.FundSource{
			UUID:     row.Uuid.String(),
			Name:     row.Name,
			Type:     row.Type.String(),
			Balance:  row.Balance,
			Currency: row.Currency,
			Details:  queries.FundSourceDetails{OwnerName: row.OwnerName},
		}

		if row.BankCode != nil && row.BankBin != nil && row.BankShortName != nil && row.AccountNumber != nil {
			fs.Details.Bank = &queries.BankDetails{
				BankCode:      *row.BankCode,
				BankBin:       *row.BankBin,
				BankShortName: *row.BankShortName,
				AccountNumber: *row.AccountNumber,
			}
		}

		fundSources = append(fundSources, fs)
	}

	return fundSources, nil
}
