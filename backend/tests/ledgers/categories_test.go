//go:build component

package ledgers_test

import (
	"context"
	"testing"

	common "github.com/quangbach27/golang-common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/apps/models"
	"backend/internal/ledgers/domain"
	ledgersClients "backend/internal/ledgers/ports/http/clients"
	"backend/internal/shared"
	apputils "backend/internal/utils"
	"backend/tests/utils"
)

// Not parallel: categories are global, and ResetLedgerPeriods clears them.

func upsertCategories(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	categories ...ledgersClients.CategoryInput,
) *ledgersClients.UpsertCategoriesClientResponse {
	t.Helper()

	resp, err := clients.Ledgers.UpsertCategoriesWithResponse(
		context.Background(), ledgersClients.UpsertCategoriesJSONRequestBody{Categories: categories}, utils.AuthEditorFn(token))
	require.NoError(t, err)

	return resp
}

func listCategories(t *testing.T, clients *utils.TestClients, token string) []ledgersClients.Category {
	t.Helper()

	resp, err := clients.Ledgers.ListCategoriesWithResponse(context.Background(), utils.AuthEditorFn(token))
	require.NoError(t, err)
	require.Equal(t, 200, resp.StatusCode(), "body: %s", string(resp.Body))

	return resp.JSON200.Items
}

func TestUpsertCategories(t *testing.T) {
	t.Run("creates categories with sub-categories and lists them as a tree", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()

		resp := upsertCategories(t, clients, token,
			ledgersClients.CategoryInput{
				Name:        "Food",
				Description: apputils.Ptr("meals"),
				SubCategories: &[]ledgersClients.SubCategoryInput{
					{Name: "Rice"}, {Name: "Coffee", Description: apputils.Ptr("daily")},
				},
			},
			ledgersClients.CategoryInput{Name: "Transport"},
		)
		require.Equal(t, 200, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Len(t, resp.JSON200.CategoryUuids, 2)

		items := listCategories(t, clients, token)
		require.Len(t, items, 2)
		assert.Equal(t, "Food", items[0].Name)
		assert.Equal(t, "meals", *items[0].Description)
		require.Len(t, items[0].SubCategories, 2)
		assert.Equal(t, "Coffee", items[0].SubCategories[0].Name)
		assert.Equal(t, "Transport", items[1].Name)
		assert.Empty(t, items[1].SubCategories)
	})

	t.Run("updates by uuid and adds a sub-category to an existing category", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()

		first := upsertCategories(t, clients, token, ledgersClients.CategoryInput{
			Name: "Food", SubCategories: &[]ledgersClients.SubCategoryInput{{Name: "Rice"}},
		})
		require.Equal(t, 200, first.StatusCode(), "body: %s", string(first.Body))
		food := first.JSON200.CategoryUuids[0]

		resp := upsertCategories(t, clients, token, ledgersClients.CategoryInput{
			Uuid: &food, Name: "Groceries", SubCategories: &[]ledgersClients.SubCategoryInput{{Name: "Fruit"}},
		})
		require.Equal(t, 200, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, food, resp.JSON200.CategoryUuids[0])

		items := listCategories(t, clients, token)
		require.Len(t, items, 1)
		assert.Equal(t, "Groceries", items[0].Name)
		assert.Len(t, items[0].SubCategories, 2)
	})

	t.Run("rejects invalid input with the index path", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()

		resp := upsertCategories(t, clients, token,
			ledgersClients.CategoryInput{Name: "Food"},
			ledgersClients.CategoryInput{Name: "Bad", SubCategories: &[]ledgersClients.SubCategoryInput{{Name: "ok"}, {Name: " "}}},
		)
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
		require.NotNil(t, resp.JSON400)
		assert.Equal(t, []string{"category-name-required"}, errorSlugs(resp.JSON400))
		require.NotNil(t, (*resp.JSON400.Details)[0].EntityId)
		assert.Equal(t, "1.1", *(*resp.JSON400.Details)[0].EntityId)
	})

	t.Run("an existing sub-category cannot move to another parent", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()

		resp := upsertCategories(t, clients, token,
			ledgersClients.CategoryInput{Name: "Food", SubCategories: &[]ledgersClients.SubCategoryInput{{Name: "Rice"}}},
			ledgersClients.CategoryInput{Name: "Transport"},
		)
		require.Equal(t, 200, resp.StatusCode(), "body: %s", string(resp.Body))

		items := listCategories(t, clients, token)
		rice := items[0].SubCategories[0].Uuid
		transport := items[1].Uuid

		moved := upsertCategories(t, clients, token, ledgersClients.CategoryInput{
			Uuid: &transport, Name: "Transport", SubCategories: &[]ledgersClients.SubCategoryInput{{Uuid: &rice, Name: "Rice"}},
		})
		require.Equal(t, 400, moved.StatusCode(), "body: %s", string(moved.Body))
		assert.Equal(t, "parent-category-invalid", moved.JSON400.Slug)

		after := listCategories(t, clients, token)
		assert.Len(t, after[0].SubCategories, 1)
		assert.Empty(t, after[1].SubCategories)
	})

	t.Run("duplicate names in the same level conflict", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()

		require.Equal(t, 200, upsertCategories(t, clients, token, ledgersClients.CategoryInput{Name: "Food"}).StatusCode())

		resp := upsertCategories(t, clients, token, ledgersClients.CategoryInput{Name: "food"})
		require.Equal(t, 409, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "category-name-taken", resp.JSON409.Slug)
	})
}

func TestPostLedgerEntriesWithCategory(t *testing.T) {
	t.Run("accepts a category and a sub-category", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		require.Equal(t, 200, upsertCategories(t, clients, token, ledgersClients.CategoryInput{
			Name: "Food", SubCategories: &[]ledgersClients.SubCategoryInput{{Name: "Rice"}},
		}).StatusCode())
		food := listCategories(t, clients, token)[0]

		inCategory, inSub := entryInput(shared.DirectionOutflow, 1_000), entryInput(shared.DirectionOutflow, 2_000)
		inCategory.CategoryUuid = &food.Uuid
		inSub.CategoryUuid = &food.SubCategories[0].Uuid

		resp := postLedgerEntries(t, clients, token, period, fs, inCategory, inSub)
		assert.Equal(t, 201, resp.StatusCode(), "body: %s", string(resp.Body))
	})

	t.Run("rejects an unknown category", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		period := openPeriod(t, clients, token, fs)

		unknown := models.CategoryUUID{UUID: common.NewUUIDv7()}
		bad := entryInput(shared.DirectionInflow, 1_000)
		bad.CategoryUuid = &unknown

		resp := postLedgerEntries(t, clients, token, period, fs, entryInput(shared.DirectionInflow, 1), bad)
		require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, []string{"category-not-found"}, errorSlugs(resp.JSON400))
		assert.Equal(t, "1", *(*resp.JSON400.Details)[0].EntityId)
	})
}
