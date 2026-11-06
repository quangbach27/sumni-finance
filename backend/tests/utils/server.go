package utils

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/quangbach27/golang-common/http/auth"
	"github.com/quangbach27/golang-common/log"
	"github.com/stretchr/testify/require"

	"backend/internal"
	"backend/internal/configs"
	"backend/internal/ledgers/adapters/bankverifier"
)

var (
	// BankVerifier lets component tests push valid bank accounts (empty list = bypass).
	BankVerifier = bankverifier.NewBankAccountVerifierStub()

	BaseURL  string
	verifier = auth.NewStubTokenVerifier()

	// DB is the pool the server uses; tests use it to reset or inspect global state.
	DB *pgxpool.Pool
)

// ResetLedgerPeriods deletes every ledger period. Only one unlocked period can exist
// at a time and there is no HTTP way to reconcile one yet, so period tests start clean.
func ResetLedgerPeriods(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	_, err := DB.Exec(ctx, "DELETE FROM ledgers.ledger_entries")
	require.NoError(t, err)
	_, err = DB.Exec(ctx, "DELETE FROM ledgers.fund_source_statements")
	require.NoError(t, err)
	_, err = DB.Exec(ctx, "DELETE FROM ledgers.ledger_periods")
	require.NoError(t, err)
}

func StartServer(ctx context.Context) {
	config := configs.NewConfig()

	log.Init(slog.LevelInfo)
	BaseURL = fmt.Sprintf("http://localhost:%d", config.App.Port)

	db, err := pgxpool.New(ctx, config.DB.Dsn())
	if err != nil {
		panic(err)
	}
	DB = db

	svc, err := internal.New(
		ctx,
		config,
		db,
		internal.ExternalServices{
			TokenVerifier:       verifier,
			BankAccountVerifier: BankVerifier,
		},
	)
	if err != nil {
		panic(err)
	}

	go func() {
		if err := svc.Run(ctx); err != nil {
			panic(err)
		}
	}()

	waitForServer()
}

func waitForServer() {
	for range 100 {
		resp, err := http.Get(BaseURL + "/healthz")
		if err == nil {
			ok := resp.StatusCode < 300
			if closeErr := resp.Body.Close(); closeErr != nil {
				slog.Error("failed to close resp", "error", closeErr)
			}

			if ok {
				return
			}
		}

		time.Sleep(50 * time.Millisecond)
	}

	panic("server did not start within 5 seconds")
}
