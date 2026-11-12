//go:build integration

package db_test

import (
	"context"
	"embed"
	"log"
	"os"
	"testing"

	"github.com/quangbach27/golang-common/db"
	"github.com/quangbach27/golang-common/testutils"

	"backend/internal/configs"
	"backend/internal/configs/modules"
)

//go:embed migrations/*.sql
var embedMigrations embed.FS

var (
	dsn   = configs.NewConfig().DB.Dsn()
	pgxDb = testutils.NewDB(dsn)
)

func TestMain(m *testing.M) {
	defer pgxDb.Close()

	if err := db.MigrateDatabaseUp(
		context.Background(),
		string(modules.AuthorizationModuleName),
		pgxDb,
		embedMigrations,
		"migrations",
	); err != nil {
		log.Fatalf("failed to run migrations: %s", err.Error())
	}

	code := m.Run()

	os.Exit(code)
}
