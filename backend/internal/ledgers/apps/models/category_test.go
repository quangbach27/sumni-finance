package models_test

import (
	"testing"

	common "github.com/quangbach27/golang-common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/apps/models"
)

func newID() models.CategoryUUID { return models.CategoryUUID{UUID: common.NewUUIDv7()} }

func slugs(t *testing.T, err error) []string {
	t.Helper()

	var cerr common.Error
	require.ErrorAs(t, err, &cerr)

	out := make([]string, 0, len(cerr.Details))
	for _, d := range cerr.Details {
		out = append(out, d.ErrorSlug)
	}

	return out
}

func TestNewCategory(t *testing.T) {
	desc := "  groceries  "

	t.Run("returns a trimmed value", func(t *testing.T) {
		id := newID()
		c, err := models.NewCategory(id, nil, "  Food ", &desc, nil)
		require.NoError(t, err)
		assert.Equal(t, "Food", c.Name)
		require.NotNil(t, c.Description)
		assert.Equal(t, "groceries", *c.Description)
		assert.Equal(t, id, c.UUID)
	})

	t.Run("blank description becomes nil", func(t *testing.T) {
		blank := "  "
		c, err := models.NewCategory(newID(), nil, "Food", &blank, nil)
		require.NoError(t, err)
		assert.Nil(t, c.Description)
	})

	t.Run("collects field errors", func(t *testing.T) {
		_, err := models.NewCategory(models.CategoryUUID{}, nil, " ", nil, nil)
		assert.ElementsMatch(t, []string{"category-name-required", "category-uuid-required"}, slugs(t, err))
	})

	t.Run("children must point at the parent", func(t *testing.T) {
		parent := newID()
		child, err := models.NewCategory(newID(), &parent, "Rice", nil, nil)
		require.NoError(t, err)

		c, err := models.NewCategory(parent, nil, "Food", nil, []models.Category{child})
		require.NoError(t, err)
		assert.Len(t, c.Children, 1)

		_, err = models.NewCategory(newID(), nil, "Other", nil, []models.Category{child})
		assert.Equal(t, []string{"parent-category-invalid"}, slugs(t, err))
	})

	t.Run("a sub-category cannot have children", func(t *testing.T) {
		parent := newID()
		grandChild, err := models.NewCategory(newID(), &parent, "Deep", nil, nil)
		require.NoError(t, err)

		_, err = models.NewCategory(newID(), &parent, "Sub", nil, []models.Category{grandChild})
		assert.Contains(t, slugs(t, err), "category-too-deep")
	})
}
