package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	commonDb "github.com/quangbach27/golang-common/db"

	"backend/internal/ledgers/adapters/db/dbmodels"
	"backend/internal/ledgers/domain"
)

type FundSourceRepository struct {
	db *pgxpool.Pool
}

var _ domain.FundSourceRepository = (*FundSourceRepository)(nil)

func NewFundSourceRepository(db *pgxpool.Pool) (*FundSourceRepository, error) {
	if db == nil {
		return nil, errors.New("db can't be nil")
	}

	return &FundSourceRepository{db: db}, nil
}

func (r *FundSourceRepository) CreateFundSource(ctx context.Context, fundSource *domain.FundSource) error {
	params := dbmodels.CreateFundSourceParams{
		Uuid:     fundSource.UUID(),
		Name:     fundSource.Name(),
		Type:     fundSource.Type(),
		Balance:  fundSource.Balance(),
		Currency: fundSource.Currency().String(),
	}

	switch d := fundSource.Details().(type) {
	case *domain.BankDetails:
		bankCode, bankBin, bankShortName, accountNumber :=
			d.BankCode(), d.BankBin(), d.BankShortName(), d.AccountNumber()

		params.OwnerName = d.OwnerName()
		params.BankCode = &bankCode
		params.BankBin = &bankBin
		params.BankShortName = &bankShortName
		params.AccountNumber = &accountNumber
	case *domain.CashDetails:
		params.OwnerName = d.OwnerName()
	default:
		return fmt.Errorf("create fund source: unsupported details type %T", d)
	}

	err := commonDb.UpdateInReadCommittedTx(ctx, r.db, func(ctx context.Context, tx pgx.Tx) error {
		return dbmodels.New(tx).CreateFundSource(ctx, params)
	})
	if err != nil {
		return fmt.Errorf("create fund source: %w", err)
	}

	return nil
}
