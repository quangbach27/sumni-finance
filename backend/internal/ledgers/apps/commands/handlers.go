package commands

import (
	"context"
	"errors"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/domain"
)

// ModulesContract is the part of the module contracts that ledgers uses.
type ModulesContract interface {
	Authorize(ctx context.Context, req client.AuthorizeRequest) (client.AuthorizeResponse, error)
}

type Handlers struct {
	modules      ModulesContract
	fsRepo       domain.FundSourceRepository
	periodRepo   domain.LedgerPeriodRepository
	reportRepo   LedgerPeriodReportRepository
	categoryRepo CategoryRepository
	fsFactory    *domain.FundSourceFactory
}

func NewHandlers(
	modules ModulesContract,
	fsRepo domain.FundSourceRepository,
	periodRepo domain.LedgerPeriodRepository,
	reportRepo LedgerPeriodReportRepository,
	categoryRepo CategoryRepository,
	fsFactory *domain.FundSourceFactory,
) (*Handlers, error) {
	var errs []error

	if modules == nil {
		errs = append(errs, errors.New("modules contract can't be nil"))
	}

	if fsRepo == nil {
		errs = append(errs, errors.New("fundsource repo can't be nil"))
	}

	if periodRepo == nil {
		errs = append(errs, errors.New("ledger period repo can't be nil"))
	}

	if reportRepo == nil {
		errs = append(errs, errors.New("ledger period report repo can't be nil"))
	}

	if categoryRepo == nil {
		errs = append(errs, errors.New("category repo can't be nil"))
	}

	if fsFactory == nil {
		errs = append(errs, errors.New("fundsource factory can't be nil"))
	}

	if len(errs) != 0 {
		return nil, errors.Join(errs...)
	}

	return &Handlers{
		modules:      modules,
		fsRepo:       fsRepo,
		periodRepo:   periodRepo,
		reportRepo:   reportRepo,
		categoryRepo: categoryRepo,
		fsFactory:    fsFactory,
	}, nil
}
