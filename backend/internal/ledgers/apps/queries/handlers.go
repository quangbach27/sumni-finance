package queries

import (
	"context"
	"errors"

	"backend/internal/shared"
)

type FundSourceReadModel interface {
	ListFundSources(ctx context.Context) ([]FundSource, error)
}

type LedgerPeriodReadModel interface {
	ListLedgerPeriods(ctx context.Context, query ListLedgerPeriods) (shared.PagedResult[LedgerPeriod], error)
}

type Handlers struct {
	fsReadModel     FundSourceReadModel
	periodReadModel LedgerPeriodReadModel
}

func NewHandlers(
	fsReadModel FundSourceReadModel,
	periodReadModel LedgerPeriodReadModel,
) (*Handlers, error) {
	var errs []error

	if fsReadModel == nil {
		errs = append(errs, errors.New("fundsource read model can't be nil"))
	}

	if periodReadModel == nil {
		errs = append(errs, errors.New("ledger period read model can't be nil"))
	}

	if len(errs) != 0 {
		return nil, errors.Join(errs...)
	}

	return &Handlers{
		fsReadModel:     fsReadModel,
		periodReadModel: periodReadModel,
	}, nil
}
