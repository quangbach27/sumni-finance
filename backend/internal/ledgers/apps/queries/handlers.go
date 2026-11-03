package queries

import (
	"context"
	"errors"
)

type FundSourceReadModel interface {
	ListFundSources(ctx context.Context) ([]FundSource, error)
}

type Handlers struct {
	fsReadModel FundSourceReadModel
}

func NewHandlers(
	fsReadModel FundSourceReadModel,
) (*Handlers, error) {
	var errs []error

	if fsReadModel == nil {
		errs = append(errs, errors.New("fundsource read model can't be nil"))
	}

	if len(errs) != 0 {
		return nil, errors.Join(errs...)
	}

	return &Handlers{
		fsReadModel: fsReadModel,
	}, nil
}
