package internal

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v5"
	commonHttp "github.com/quangbach27/golang-common/http"
	commonAuth "github.com/quangbach27/golang-common/http/auth"
	"golang.org/x/sync/errgroup"

	"backend/internal/configs"
	"backend/internal/configs/modules"
	"backend/internal/configs/modules/contracts"
	"backend/internal/ledgers"
)

type ExternalServices struct {
	TokenVerifier commonAuth.TokenVerifier
}

type Svc struct {
	config *configs.Config

	echoServer *commonHttp.EchoServer
	pgxDb      *pgxpool.Pool
}

func New(
	ctx context.Context,
	config *configs.Config,
	pgxDB *pgxpool.Pool,
	externalServices ExternalServices,
) (*Svc, error) {
	moduleContracts := &contracts.Contracts{}
	modules := []modules.Module{
		ledgers.NewModule(pgxDB),
	}

	if err := initModules(ctx, modules); err != nil {
		return nil, err
	}

	if err := registerModuleContracts(
		ctx,
		modules,
		moduleContracts,
	); err != nil {
		return nil, err
	}

	echoServer, err := newEchoServer(
		ctx,
		config,
		externalServices.TokenVerifier,
		modules,
	)
	if err != nil {
		return nil, err
	}

	return &Svc{
		config,
		echoServer,
		pgxDB,
	}, nil
}

func initModules(
	ctx context.Context,
	modules []modules.Module,
) error {
	var errs []error

	for _, m := range modules {
		if err := m.Init(ctx); err != nil {
			errs = append(errs, fmt.Errorf("failed to init module %s: %w", string(m.Name()), err))
		}
	}

	return errors.Join(errs...)
}

func registerModuleContracts(
	ctx context.Context,
	modules []modules.Module,
	moduleContracts *contracts.Contracts,
) error {
	var errs []error

	for _, m := range modules {
		err := m.RegisterContracts(ctx, moduleContracts)
		if err != nil {
			errs = append(errs, err)
		}
	}

	if len(errs) != 0 {
		return fmt.Errorf("failed to register contracts: %w", errors.Join(errs...))
	}

	if err := moduleContracts.Verify(); err != nil {
		return fmt.Errorf("failed to verify contracts: %w", err)
	}

	return nil
}

func newEchoServer(
	ctx context.Context,
	config *configs.Config,
	tokenVerifier commonAuth.TokenVerifier,
	modules []modules.Module,
) (*commonHttp.EchoServer, error) {
	echoServer, err := commonHttp.NewEchoServerWithTokenVerifier(
		tokenVerifier,
		func(c *commonHttp.EchoServerConfig) {
			c.Port = config.App.Port
			c.AllowedOrigins = config.App.CorsAllowedOrigins
			c.AuthConfig = commonHttp.AuthConfig{
				PublicPaths:    []string{"/healthz"},
				PublicPrefixes: []string{"/public/"},
			}
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create echo server: %w", err)
	}

	echoServer.Router().GET("/healthz", func(c *echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	var errs []error

	for _, m := range modules {
		err := m.RegisterHttp(ctx, echoServer.Router())
		if err != nil {
			errs = append(errs, fmt.Errorf("failed to register http module: %s", string(m.Name())))
		}
	}
	if len(errs) != 0 {
		return nil, errors.Join(errs...)
	}

	return echoServer, nil
}

func (s *Svc) Run(ctx context.Context) error {
	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		if err := s.echoServer.Start(ctx); err != nil {
			return err
		}

		return nil
	})

	g.Go(func() error {
		<-ctx.Done()
		defer s.pgxDb.Close()

		return nil
	})

	return g.Wait()
}
