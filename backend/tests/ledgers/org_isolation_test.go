//go:build component

package ledgers_test

import (
	"testing"
	"time"

	common "github.com/quangbach27/golang-common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
	ledgersClients "backend/internal/ledgers/ports/http/clients"
	"backend/tests/utils"
)

// Fund sources, ledger periods and categories belong to the org of the session.
func TestOrgIsolation(t *testing.T) {
	clients := utils.NewTestClients(t)
	orgA := newOrgUserToken("org-" + common.NewUUIDv7().String())
	orgB := newOrgUserToken("org-" + common.NewUUIDv7().String())

	_, fsA := createFundSource(t, clients, orgA, domain.FundSourceTypeCash)
	periodA := openPeriod(t, clients, orgA, fsA)
	require.Equal(t, 200, upsertCategories(t, clients, orgA, ledgersClients.CategoryInput{Name: "Food"}).StatusCode())

	t.Run("lists only the own org's data", func(t *testing.T) {
		assert.Len(t, listFundSources(t, clients, orgA), 1)
		assert.Empty(t, listFundSources(t, clients, orgB))
		assert.Len(t, listCategories(t, clients, orgA), 1)
		assert.Empty(t, listCategories(t, clients, orgB))
		assert.Equal(t, 404, getUnlockedLedgerPeriod(t, clients, orgB).StatusCode())
	})

	t.Run("another org's fund source and period are not found", func(t *testing.T) {
		resp := openLedgerPeriod(t, clients, orgB, novemberPeriodRequest(time.November, fsA))
		assert.Equal(t, 404, resp.StatusCode(), "body: %s", string(resp.Body))

		closeResp, err := clients.Ledgers.CloseLedgerPeriodWithResponse(t.Context(), periodA, utils.AuthEditorFn(orgB))
		require.NoError(t, err)
		assert.Equal(t, 404, closeResp.StatusCode(), "body: %s", string(closeResp.Body))
	})

	t.Run("each org can have its own unlocked period and category names", func(t *testing.T) {
		_, fsB := createFundSource(t, clients, orgB, domain.FundSourceTypeCash)
		openPeriod(t, clients, orgB, fsB)
		assert.Equal(t, 200, upsertCategories(t, clients, orgB, ledgersClients.CategoryInput{Name: "Food"}).StatusCode())
	})
}
