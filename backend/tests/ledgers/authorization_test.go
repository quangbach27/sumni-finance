//go:build component

package ledgers_test

import (
	"context"
	"testing"

	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
	ledgersClients "backend/internal/ledgers/ports/http/clients"
	"backend/internal/shared"
	"backend/tests/utils"
)

// Every ledgers command and query is authorized by role: viewers read, only
// admins write, and a session without an org is rejected.
func TestLedgersAuthorization(t *testing.T) {
	clients := utils.NewTestClients(t)
	orgID := "org-" + common.NewUUIDv7().String()
	admin := newOrgRoleToken(orgID, shared.RoleOfficeAdmin)
	viewer := newOrgRoleToken(orgID, shared.RoleOfficeViewer)

	createFundSource(t, clients, admin, domain.FundSourceTypeCash)

	t.Run("viewer can read", func(t *testing.T) {
		assert.Len(t, listFundSources(t, clients, viewer), 1)
		assert.Empty(t, listCategories(t, clients, viewer))
	})

	t.Run("viewer cannot write", func(t *testing.T) {
		resp, err := clients.Ledgers.CreateFundSourceWithResponse(context.Background(), ledgersClients.CreateFundSourceRequest{
			Name:         "forbidden",
			Type:         domain.FundSourceTypeCash,
			StartBalance: decimal.NewFromInt(1),
			Currency:     shared.CurrencyVND,
			Details:      ledgersClients.FundSourceDetails{OwnerName: "An"},
		}, utils.AuthEditorFn(viewer))
		require.NoError(t, err)
		assert.Equal(t, 403, resp.StatusCode(), "body: %s", string(resp.Body))

		upsert := upsertCategories(t, clients, viewer, ledgersClients.CategoryInput{Name: "Food"})
		assert.Equal(t, 403, upsert.StatusCode(), "body: %s", string(upsert.Body))

		assert.Len(t, listFundSources(t, clients, admin), 1, "forbidden write must not create data")
	})

	t.Run("session without org or role is rejected", func(t *testing.T) {
		noOrg := utils.NewSession("user-"+common.NewUUIDv7().String(), shared.RoleOfficeAdmin.String())
		resp, err := clients.Ledgers.ListFundSourcesWithResponse(context.Background(), utils.AuthEditorFn(noOrg))
		require.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode(), "body: %s", string(resp.Body))

		noRole := utils.NewOrgSession("user-"+common.NewUUIDv7().String(), orgID, "")
		resp, err = clients.Ledgers.ListFundSourcesWithResponse(context.Background(), utils.AuthEditorFn(noRole))
		require.NoError(t, err)
		assert.Equal(t, 403, resp.StatusCode(), "body: %s", string(resp.Body))
	})
}
