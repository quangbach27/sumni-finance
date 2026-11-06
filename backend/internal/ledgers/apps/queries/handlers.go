package queries

import (
	"context"
	"errors"

	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type FundSourceReadModel interface {
	ListFundSources(ctx context.Context) ([]FundSource, error)
}

type LedgerPeriodReadModel interface {
	ListLedgerPeriods(ctx context.Context, query ListLedgerPeriods) (shared.PagedResult[LedgerPeriod], error)
	GetUnlockedLedgerPeriod(ctx context.Context) (UnlockedLedgerPeriod, error)
}

type FundSourceStatementReadModel interface {
	ListFundSourceStatements(ctx context.Context, ledgerPeriodUUID domain.LedgerPeriodUUID) ([]FundSourceStatement, error)
}

type Handlers struct {
	fsReadModel        FundSourceReadModel
	periodReadModel    LedgerPeriodReadModel
	statementReadModel FundSourceStatementReadModel
}

func NewHandlers(
	fsReadModel FundSourceReadModel,
	periodReadModel LedgerPeriodReadModel,
	statementReadModel FundSourceStatementReadModel,
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

	if len(errs) != 0 {
		return nil, errors.Join(errs...)
	}

	return &Handlers{
		fsReadModel:        fsReadModel,
		periodReadModel:    periodReadModel,
		statementReadModel: statementReadModel,
	}, nil
}
