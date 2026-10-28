package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	commonAuth "github.com/quangbach27/golang-common/http/auth"

	"backend/internal"
	"backend/internal/configs"
)

func main() {
	config := configs.NewConfig()

	startCtx, cancelStart := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelStart()

	pgxDb, err := newDbConn(startCtx, config.DB)
	if err != nil {
		log.Fatalf("failed to create db conn: %s", err.Error())
	}

	svc, err := internal.New(
		startCtx,
		config,
		pgxDb,
		internal.ExternalServices{
			TokenVerifier: newStubTokenVerifier(),
		},
	)
	if err != nil {
		log.Fatalf("failed to create svc: %s", err.Error())
	}

	ctx, cancelStart := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancelStart()

	if err = svc.Run(ctx); err != nil {
		log.Fatalf("failed to run svc: %s", err.Error())
	}
}

func newDbConn(ctx context.Context, dbConfig *configs.DBConfig) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(dbConfig.Dsn())
	if err != nil {
		log.Fatal(err)
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

func newStubTokenVerifier() commonAuth.TokenVerifier {
	tokenVerifier := commonAuth.NewStubTokenVerifier()
	tokenVerifier.Add("token-1", &commonAuth.Session{
		Subject:   "user-123",
		SessionID: "session-123",
		Role:      "",
		Extra: map[string]any{
			"organization": "clb",
		},
	})

	return tokenVerifier
}
