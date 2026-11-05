package shared_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/shared"
)

func TestNewPageRequest(t *testing.T) {
	t.Parallel()

	t.Run("defaults", func(t *testing.T) {
		t.Parallel()
		req, err := shared.NewPageRequest(0, 0)
		require.NoError(t, err)
		assert.Equal(t, 1, req.Page)
		assert.Equal(t, 20, req.PageSize)
		assert.Equal(t, 0, req.Offset())
		assert.Equal(t, 20, req.Limit())
	})

	t.Run("offset", func(t *testing.T) {
		t.Parallel()
		req, err := shared.NewPageRequest(3, 10)
		require.NoError(t, err)
		assert.Equal(t, 20, req.Offset())
	})

	t.Run("invalid", func(t *testing.T) {
		t.Parallel()
		for _, c := range [][2]int{{-1, 10}, {1, -1}, {1, 101}} {
			_, err := shared.NewPageRequest(c[0], c[1])
			assert.Error(t, err, "%v", c)
		}
	})
}
