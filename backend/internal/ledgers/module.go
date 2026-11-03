package ledgers

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"

	"backend/internal/configs/modules"
	"backend/internal/configs/modules/contracts"
	"backend/internal/ledgers/adapters/bankverifier"
	"backend/internal/ledgers/adapters/db"
	"backend/internal/ledgers/apps/commands"
	"backend/internal/ledgers/apps/queries"
	"backend/internal/ledgers/domain"
	portHttp "backend/internal/ledgers/ports/http"
	"backend/internal/ledgers/ports/module"
)

type Module struct {
	pgxDb *pgxpool.Pool

	commandHandlers *commands.Handlers
	queryHandlers   *queries.Handlers
}

var _ modules.Module = (*Module)(nil)

func NewModule(pgxDb *pgxpool.Pool) *Module {
	var errs []error
	if pgxDb == nil {
		errs = append(errs, errors.New("pgxDb can't be nil"))
	}

	if len(errs) > 0 {
		log.Fatalf("failed to create ledgers modules: %s", errors.Join(errs...))
	}

	return &Module{
		pgxDb: pgxDb,
	}
}

func (m *Module) Name() modules.Name {
	return modules.LedgersModuleName
}

func (m *Module) Init(ctx context.Context) error {
	fsRepo, err := db.NewFundSourceRepository(m.pgxDb)
	if err != nil {
		return err
	}

	// TODO: replace the stub with a real bank account verifier.
	fsFactory, err := domain.NewFundSourceFactory(bankverifier.NewBankAccountVerifierStub())
	if err != nil {
		return err
	}

	commandHandlers, err := commands.NewHandlers(fsRepo, fsFactory)
	if err != nil {
		return err
	}

	fsReadModel, err := db.NewFundSourceReadModel(m.pgxDb)
	if err != nil {
		return err
	}

	queryHandlers, err := queries.NewHandlers(fsReadModel)
	if err != nil {
		return err
	}

	m.commandHandlers = commandHandlers
	m.queryHandlers = queryHandlers

	return nil
}

func (m *Module) RegisterHttp(ctx context.Context, router modules.EchoRouter) error {
	httpHandlers, err := portHttp.NewHandlers(m.commandHandlers, m.queryHandlers)
	if err != nil {
		return err
	}

	portHttp.Register(router, httpHandlers)
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
