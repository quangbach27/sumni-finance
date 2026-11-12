package authorization

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	commonDb "github.com/quangbach27/golang-common/db"

	"backend/internal/authorization/adapters/db"
	"backend/internal/authorization/apps"
	"backend/internal/authorization/apps/commands"
	portHttp "backend/internal/authorization/ports/http"
	"backend/internal/authorization/ports/module"
	"backend/internal/configs/modules"
	"backend/internal/configs/modules/contracts"
)

type Module struct {
	pgxDb *pgxpool.Pool

	commandHandlers *commands.Handlers
	grants          *db.GrantReadModel
	catalog         *apps.PolicyCatalog
}

var _ modules.Module = (*Module)(nil)

func NewModule(pgxDb *pgxpool.Pool) *Module {
	if pgxDb == nil {
		log.Fatalf("failed to create authorization module: %s", errors.New("pgxDb can't be nil"))
	}

	return &Module{pgxDb: pgxDb}
}

func (m *Module) Name() modules.Name {
	return modules.AuthorizationModuleName
}

func (m *Module) Init(ctx context.Context) error {
	if err := m.runMigration(ctx); err != nil {
		return err
	}

	grantRepo, err := db.NewAccessGrantRepository(m.pgxDb)
	if err != nil {
		return err
	}

	grants, err := db.NewGrantReadModel(m.pgxDb)
	if err != nil {
		return err
	}

	catalog, err := apps.NewDefaultPolicyCatalog(grants)
	if err != nil {
		return err
	}

	commandHandlers, err := commands.NewHandlers(grantRepo, catalog)
	if err != nil {
		return err
	}

	m.commandHandlers = commandHandlers
	m.grants = grants
	m.catalog = catalog

	return nil
}

//go:embed adapters/db/migrations/*.sql
var embedMigrations embed.FS

func (m *Module) runMigration(ctx context.Context) error {
	if err := commonDb.MigrateDatabaseUp(
		ctx,
		string(m.Name()),
		m.pgxDb,
		embedMigrations,
		"adapters/db/migrations",
	); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	return nil
}

func (m *Module) RegisterHttp(_ context.Context, router modules.EchoRouter) error {
	httpHandlers, err := portHttp.NewHandlers(m.commandHandlers, m.catalog, m.grants)
	if err != nil {
		return err
	}

	portHttp.Register(router, httpHandlers)
	return nil
}

func (m *Module) RegisterContracts(_ context.Context, contracts *contracts.Contracts) error {
	authorization, err := module.NewAuthorization(m.catalog)
	if err != nil {
		return fmt.Errorf("failed to register authorization module contract: %w", err)
	}

	contracts.Authorization = authorization
	return nil
}
