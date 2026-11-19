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

func (r *FundSourceReadModel) ListFundSources(ctx context.Context, orgID string) ([]queries.FundSource, error) {
	rows, err := dbmodels.New(r.db).ListFundSources(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("list fund sources: %w", err)
	}

	fundSources := make([]queries.FundSource, 0, len(rows))
	for _, row := range rows {
		fundSources = append(fundSources, toQueryFundSource(row))
	}

	return fundSources, nil
}

func (r *FundSourceReadModel) GetFundSource(
	ctx context.Context,
	orgID string,
	fundSourceUUID domain.FundSourceUUID,
) (queries.FundSourceDetail, error) {
	q := dbmodels.New(r.db)

	row, err := q.GetFundSourceByID(ctx, dbmodels.GetFundSourceByIDParams{OrgID: orgID, Uuid: fundSourceUUID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return queries.FundSourceDetail{}, common.NewNotFoundError("fund-source-not-found", "fund source %s was not found", fundSourceUUID.String())
		}

		return queries.FundSourceDetail{}, fmt.Errorf("get fund source: %w", err)
	}

	detail := queries.FundSourceDetail{FundSource: toQueryFundSource(row)}

	latest, err := q.GetLatestLedgerEntryOccurredAt(ctx, dbmodels.GetLatestLedgerEntryOccurredAtParams{OrgID: orgID, FundSourceUuid: fundSourceUUID})
	switch {
	case err == nil:
		detail.LatestEntryAt = &latest
	case !errors.Is(err, pgx.ErrNoRows):
		return queries.FundSourceDetail{}, fmt.Errorf("get latest entry time: %w", err)
	}

	return detail, nil
}

func toQueryFundSource(row dbmodels.LedgersFundSource) queries.FundSource {
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

	return fs
}
