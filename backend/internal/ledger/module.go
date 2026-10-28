package ledger

import (
	"context"
	"fmt"

	"backend/internal/configs/modules"
	"backend/internal/configs/modules/contracts"
	"backend/internal/ledger/ports/module"
)

type Module struct{}

var _ modules.Module = (*Module)(nil)

func NewModule() *Module {
	return &Module{}
}

func (m *Module) Name() modules.Name {
	return modules.LedgerModuleName
}

func (m *Module) Init(ctx context.Context) error {
	return nil
}

func (m *Module) RegisterHttp(ctx context.Context, router modules.EchoRouter) error {
	return nil
}

func (m *Module) RegisterContracts(ctx context.Context, contracts *contracts.Contracts) error {
	ledgerContract, err := module.NewLedger()
	if err != nil {
		return fmt.Errorf("failed to register ledger module contract: %w", err)
	}

	contracts.Ledger = ledgerContract
	return nil
}
