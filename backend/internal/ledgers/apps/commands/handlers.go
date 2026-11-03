package commands

import (
	"errors"

	"backend/internal/ledgers/domain"
)

type Handlers struct {
	fsRepo    domain.FundSourceRepository
	fsFactory *domain.FundSourceFactory
}

func NewHandlers(
	fsRepo domain.FundSourceRepository,
	fsFactory *domain.FundSourceFactory,
) (*Handlers, error) {
	var errs []error

	if fsRepo == nil {
		errs = append(errs, errors.New("fundsource repo can't be nil"))
	}

	if fsFactory == nil {
		errs = append(errs, errors.New("fundsource factory can't be nil"))
	}

	if len(errs) != 0 {
		return nil, errors.Join(errs...)
	}

	return &Handlers{
		fsRepo:    fsRepo,
		fsFactory: fsFactory,
	}, nil
}
