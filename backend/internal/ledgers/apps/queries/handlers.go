package queries

import (
	"context"
	"errors"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type FundSourceReadModel interface {
	ListFundSources(ctx context.Context, orgID string) ([]FundSource, error)
	GetFundSource(ctx context.Context, orgID string, fundSourceUUID domain.FundSourceUUID) (FundSourceDetail, error)
}

type LedgerEntryReadModel interface {
	ListLedgerEntries(ctx context.Context, orgID string, query ListLedgerEntries) (shared.PagedResult[LedgerEntryListItem], error)
	GetLedgerEntry(ctx context.Context, orgID string, ledgerEntryUUID domain.LedgerEntryUUID) (LedgerEntryListItem, error)
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

// ModulesContract is the part of the module contracts that ledgers uses.
type ModulesContract interface {
	Authorize(ctx context.Context, req client.AuthorizeRequest) (client.AuthorizeResponse, error)
}

type Handlers struct {
	modules            ModulesContract
	fsReadModel        FundSourceReadModel
	periodReadModel    LedgerPeriodReadModel
	statementReadModel FundSourceStatementReadModel
	categoryReadModel  CategoryReadModel
	entryReadModel     LedgerEntryReadModel
}

func NewHandlers(
	modules ModulesContract,
	fsReadModel FundSourceReadModel,
	periodReadModel LedgerPeriodReadModel,
	statementReadModel FundSourceStatementReadModel,
	categoryReadModel CategoryReadModel,
	entryReadModel LedgerEntryReadModel,
) (*Handlers, error) {
	var errs []error

	if modules == nil {
		errs = append(errs, errors.New("modules contract can't be nil"))
	}

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

	if entryReadModel == nil {
		errs = append(errs, errors.New("ledger entry read model can't be nil"))
	}

	if len(errs) != 0 {
		return nil, errors.Join(errs...)
	}

	return &Handlers{
		modules:            modules,
		fsReadModel:        fsReadModel,
		periodReadModel:    periodReadModel,
		statementReadModel: statementReadModel,
		categoryReadModel:  categoryReadModel,
		entryReadModel:     entryReadModel,
	}, nil
}
