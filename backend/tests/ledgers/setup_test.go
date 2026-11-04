//go:build component

package ledgers_test

import (
	"context"
	"os"
	"testing"

	"backend/tests/utils"
)

func TestMain(m *testing.M) {
	utils.StartServer(context.Background())

	os.Exit(m.Run())
}
