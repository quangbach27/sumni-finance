package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	commonLog "github.com/quangbach27/golang-common/log"

	"backend/internal"
	"backend/internal/configs"
	"backend/internal/configs/auth"
	"backend/internal/ledgers/adapters/bankverifier"
)

func main() {
	commonLog.Init(slog.LevelInfo)

	config := configs.NewConfig()
	slog.Info("starting backend", "env", config.App.Env, "port", config.App.Port)

	startCtx, cancelStart := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelStart()

	if err := configs.LoadSecrets(startCtx, config); err != nil {
		fatal("failed to load secrets", err)
	}

	pgxDb, err := newDbConn(startCtx, config.DB)
	if err != nil {
		fatal("failed to create db conn", err)
	}

	tokenVerifier, err := auth.NewClerkVerifier(config.Clerk.ClerkSecretKey, config.Clerk.AuthorizedParties)
	if err != nil {
		fatal("failed to create clerk verifier", err)
	}

	svc, err := internal.New(
		startCtx,
		config,
		pgxDb,
		internal.ExternalServices{
			TokenVerifier:       tokenVerifier,
			BankAccountVerifier: bankverifier.NewBankAccountVerifierStub(),
		},
	)
	if err != nil {
		fatal("failed to create svc", err)
	}
	slog.Info("service initialised")

	ctx, cancelRun := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancelRun()

	slog.Info("service listening", "port", config.App.Port)
	if err = svc.Run(ctx); err != nil {
		fatal("failed to run svc", err)
	}
}

// fatal logs err as structured JSON on stderr and exits, so the failure shows up in container logs.
func fatal(msg string, err error) {
	slog.Error(msg, "error", err)
	os.Exit(1)
}

func newDbConn(ctx context.Context, dbConfig *configs.DBConfig) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(dbConfig.Dsn())
	if err != nil {
		return nil, fmt.Errorf("failed to parse db config: %w", err)
	}

	cfg.MaxConns = 10                      // max connections in the pool
	cfg.MinConns = 2                       // keep this many open
	cfg.MaxConnLifetime = time.Hour        // recycle connections after this
	cfg.MaxConnIdleTime = 30 * time.Minute // close idle ones after this
	cfg.HealthCheckPeriod = time.Minute    // background check interval

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping db: %w", err)
	}

	return pool, nil
}
