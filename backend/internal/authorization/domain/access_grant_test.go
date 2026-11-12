package domain_test

import (
	"testing"

	common "github.com/quangbach27/golang-common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/authorization/domain"
	"backend/internal/shared"
)

func slugOf(t *testing.T, err error) string {
	t.Helper()

	var cerr common.Error
	require.ErrorAs(t, err, &cerr)

	return cerr.ErrorSlug
}

func TestNewAccessGrant(t *testing.T) {
	t.Parallel()

	scope, err := shared.NewResourceScope(shared.ResourceFundSource, "123")
	require.NoError(t, err)

	t.Run("scoped grant with duplicate actions", func(t *testing.T) {
		t.Parallel()
		g, err := domain.NewAccessGrant(
			"org", "user_1", shared.ResourceLedgerEntry,
			[]shared.Action{shared.ActionCreate, shared.ActionUpdate, shared.ActionCreate},
			&scope, "admin",
		)
		require.NoError(t, err)
		assert.False(t, g.UUID().IsZero())
		assert.Equal(t, []shared.Action{shared.ActionCreate, shared.ActionUpdate}, g.Actions())
		assert.True(t, g.Covers(shared.ActionUpdate))
		assert.False(t, g.Covers(shared.ActionDelete))
		assert.Equal(t, scope, *g.Scope())
	})

	t.Run("unscoped grant", func(t *testing.T) {
		t.Parallel()
		g, err := domain.NewAccessGrant(
			"org", "user_1", shared.ResourceFundSource,
			[]shared.Action{shared.ActionCreate}, nil, "admin",
		)
		require.NoError(t, err)
		assert.Nil(t, g.Scope())
	})

	errCases := []struct {
		name     string
		org      string
		user     string
		by       string
		resource shared.Resource
		actions  []shared.Action
		slug     string
	}{
		{"no org", "", "u", "a", shared.ResourceFundSource, []shared.Action{shared.ActionCreate}, "org-id-required"},
		{"no user", "o", "", "a", shared.ResourceFundSource, []shared.Action{shared.ActionCreate}, "user-id-required"},
		{"no granter", "o", "u", "", shared.ResourceFundSource, []shared.Action{shared.ActionCreate}, "granted-by-required"},
		{"no resource", "o", "u", "a", shared.Resource{}, []shared.Action{shared.ActionCreate}, "resource-required"},
		{"access grant not grantable", "o", "u", "a", shared.ResourceAccessGrant, []shared.Action{shared.ActionCreate}, "resource-not-grantable"},
		{"no actions", "o", "u", "a", shared.ResourceFundSource, nil, "actions-required"},
		{"empty action", "o", "u", "a", shared.ResourceFundSource, []shared.Action{{}}, "action-required"},
	}

	for _, tt := range errCases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			_, err := domain.NewAccessGrant(tt.org, tt.user, tt.resource, tt.actions, nil, tt.by)
			assert.Equal(t, tt.slug, slugOf(t, err))
		})
	}
}

func TestAccessGrant_ChangeActions(t *testing.T) {
	t.Parallel()

	g, err := domain.NewAccessGrant("o", "u", shared.ResourceFundSource, []shared.Action{shared.ActionCreate}, nil, "a")
	require.NoError(t, err)

	require.NoError(t, g.ChangeActions([]shared.Action{shared.ActionUpdate}))
	assert.Equal(t, []shared.Action{shared.ActionUpdate}, g.Actions())

	assert.Error(t, g.ChangeActions(nil))
	assert.Equal(t, []shared.Action{shared.ActionUpdate}, g.Actions(), "failed change keeps old actions")
}
