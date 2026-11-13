package queries

import (
	"context"
	"errors"

	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type FundSourceReadModel interface {
	ListFundSources(ctx context.Context, orgID string) ([]FundSource, error)
}

type LedgerPeriodReadModel interface {
	ListLedgerPeriods(ctx context.Context, orgID string, query ListLedgerPeriods) (shared.PagedResult[LedgerPeriod], error)
	GetLedgerPeriod(ctx context.Context, orgID string, ledgerPeriodUUID domain.LedgerPeriodUUID) (LedgerPeriodDetail, error)
	GetUnlockedLedgerPeriod(ctx context.Context, orgID string) (LedgerPeriodDetail, error)
}

type FundSourceStatementReadModel interface {
	ListFundSourceStatements(ctx context.Context, orgID string, ledgerPeriodUUID domain.LedgerPeriodUUID) ([]FundSourceStatement, error)
}

type CategoryReadModel interface {
	ListCategories(ctx context.Context, orgID string) ([]Category, error)
}

type Handlers struct {
	fsReadModel        FundSourceReadModel
	periodReadModel    LedgerPeriodReadModel
	statementReadModel FundSourceStatementReadModel
	categoryReadModel  CategoryReadModel
}

func NewHandlers(
	fsReadModel FundSourceReadModel,
	periodReadModel LedgerPeriodReadModel,
	statementReadModel FundSourceStatementReadModel,
	categoryReadModel CategoryReadModel,
) (*Handlers, error) {
	var errs []error

	if fsReadModel == nil {
		errs = append(errs, errors.New("fundsource read model can't be nil"))
	}

	if periodReadModel == nil {
		errs = append(errs, errors.New("ledger period read model can't be nil"))
	}

	if statementReadModel == nil {
		errs = append(errs, errors.New("fund source statement read model can't be nil"))
	}

	if categoryReadModel == nil {
		errs = append(errs, errors.New("category read model can't be nil"))
	}

	if len(errs) != 0 {
		return nil, errors.Join(errs...)
	}

	return &Handlers{
		fsReadModel:        fsReadModel,
		periodReadModel:    periodReadModel,
		statementReadModel: statementReadModel,
		categoryReadModel:  categoryReadModel,
	}, nil
}
