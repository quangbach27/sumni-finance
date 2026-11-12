//go:build integration

package db_test

import (
	"context"
	"errors"
	"testing"

	common "github.com/quangbach27/golang-common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/authorization/adapters/db"
	"backend/internal/authorization/apps/models"
	"backend/internal/authorization/domain"
	"backend/internal/shared"
)

func newOrg() string { return "org-" + common.NewUUIDv7().String() }

func scopeOf(t *testing.T, resource shared.Resource, id string) *shared.ResourceScope {
	t.Helper()

	ref, err := shared.NewResourceScope(resource, id)
	require.NoError(t, err)

	return &ref
}

func newGrant(
	t *testing.T, org, user string, resource shared.Resource,
	actions []shared.Action, scope *shared.ResourceScope,
) *domain.AccessGrant {
	t.Helper()

	g, err := domain.NewAccessGrant(org, user, resource, actions, scope, "admin")
	require.NoError(t, err)

	return g
}

func slug(t *testing.T, err error) string {
	t.Helper()

	cerr, ok := errors.AsType[common.Error](err)
	require.True(t, ok, "expected common.Error, got %v", err)

	return cerr.ErrorSlug
}

func TestAccessGrantRepository(t *testing.T) {
	ctx := context.Background()

	repo, err := db.NewAccessGrantRepository(pgxDb)
	require.NoError(t, err)

	rm, err := db.NewGrantReadModel(pgxDb)
	require.NoError(t, err)

	t.Run("create then list", func(t *testing.T) {
		org := newOrg()
		g := newGrant(t, org, "user_1", shared.ResourceLedgerEntry,
			[]shared.Action{shared.ActionCreate, shared.ActionUpdate},
			scopeOf(t, shared.ResourceFundSource, "123"))
		require.NoError(t, repo.CreateAccessGrant(ctx, g))

		views, err := rm.ListGrants(ctx, models.ListGrantsQuery{OrgID: org})
		require.NoError(t, err)
		require.Len(t, views, 1)
		assert.Equal(t, g.UUID(), views[0].UUID)
		assert.Equal(t, "user_1", views[0].UserID)
		assert.Equal(t, []shared.Action{shared.ActionCreate, shared.ActionUpdate}, views[0].Actions)
		require.NotNil(t, views[0].Scope)
		assert.Equal(t, "fund_source/123", views[0].Scope.String())
	})

	t.Run("duplicate grant conflicts", func(t *testing.T) {
		org := newOrg()
		scope := scopeOf(t, shared.ResourceFundSource, "123")
		require.NoError(t, repo.CreateAccessGrant(ctx, newGrant(t, org, "u", shared.ResourceLedgerEntry,
			[]shared.Action{shared.ActionCreate}, scope)))

		err := repo.CreateAccessGrant(ctx, newGrant(t, org, "u", shared.ResourceLedgerEntry,
			[]shared.Action{shared.ActionUpdate}, scope))
		assert.Equal(t, "access-grant-already-exists", slug(t, err))
	})

	t.Run("duplicate unscoped grant conflicts", func(t *testing.T) {
		org := newOrg()
		require.NoError(t, repo.CreateAccessGrant(ctx, newGrant(t, org, "u", shared.ResourceFundSource,
			[]shared.Action{shared.ActionCreate}, nil)))

		err := repo.CreateAccessGrant(ctx, newGrant(t, org, "u", shared.ResourceFundSource,
			[]shared.Action{shared.ActionUpdate}, nil))
		assert.Equal(t, "access-grant-already-exists", slug(t, err))
	})

	t.Run("update actions", func(t *testing.T) {
		org := newOrg()
		g := newGrant(t, org, "u", shared.ResourceLedgerPeriod, []shared.Action{shared.ActionCreate}, nil)
		require.NoError(t, repo.CreateAccessGrant(ctx, g))

		err := repo.UpdateAccessGrant(ctx, org, g.UUID(), func(_ context.Context, grant *domain.AccessGrant) error {
			return grant.ChangeActions([]shared.Action{shared.ActionUpdate, shared.ActionDelete})
		})
		require.NoError(t, err)

		views, err := rm.ListGrants(ctx, models.ListGrantsQuery{OrgID: org})
		require.NoError(t, err)
		require.Len(t, views, 1)
		assert.Equal(t, []shared.Action{shared.ActionUpdate, shared.ActionDelete}, views[0].Actions)
	})

	t.Run("update or delete in another org is not found", func(t *testing.T) {
		org := newOrg()
		g := newGrant(t, org, "u", shared.ResourceLedgerPeriod, []shared.Action{shared.ActionCreate}, nil)
		require.NoError(t, repo.CreateAccessGrant(ctx, g))

		noop := func(context.Context, *domain.AccessGrant) error { return nil }
		err := repo.UpdateAccessGrant(ctx, newOrg(), g.UUID(), noop)
		assert.Equal(t, "access-grant-not-found", slug(t, err))

		err = repo.DeleteAccessGrant(ctx, newOrg(), g.UUID())
		assert.Equal(t, "access-grant-not-found", slug(t, err))
	})

	t.Run("delete", func(t *testing.T) {
		org := newOrg()
		g := newGrant(t, org, "u", shared.ResourceLedgerPeriod, []shared.Action{shared.ActionCreate}, nil)
		require.NoError(t, repo.CreateAccessGrant(ctx, g))
		require.NoError(t, repo.DeleteAccessGrant(ctx, org, g.UUID()))

		views, err := rm.ListGrants(ctx, models.ListGrantsQuery{OrgID: org})
		require.NoError(t, err)
		assert.Empty(t, views)

		err = repo.DeleteAccessGrant(ctx, org, g.UUID())
		assert.Equal(t, "access-grant-not-found", slug(t, err))
	})
}

// TestGrantReadModel_HasGrant covers who a grant applies to: only the grantee, only in
// their org, only for the granted actions and (when scoped) only within the scope.
func TestGrantReadModel_HasGrant(t *testing.T) {
	ctx := context.Background()

	repo, err := db.NewAccessGrantRepository(pgxDb)
	require.NoError(t, err)

	rm, err := db.NewGrantReadModel(pgxDb)
	require.NoError(t, err)

	org := newOrg()
	fs123 := scopeOf(t, shared.ResourceFundSource, "123")
	fs125 := scopeOf(t, shared.ResourceFundSource, "125")

	// user_1: entries on fund source 123 (create+update), and may create fund sources anywhere.
	require.NoError(t, repo.CreateAccessGrant(ctx, newGrant(t, org, "user_1", shared.ResourceLedgerEntry,
		[]shared.Action{shared.ActionCreate, shared.ActionUpdate}, fs123)))
	require.NoError(t, repo.CreateAccessGrant(ctx, newGrant(t, org, "user_1", shared.ResourceFundSource,
		[]shared.Action{shared.ActionCreate}, nil)))
	// user_2: entries on fund source 125 only.
	require.NoError(t, repo.CreateAccessGrant(ctx, newGrant(t, org, "user_2", shared.ResourceLedgerEntry,
		[]shared.Action{shared.ActionCreate}, fs125)))

	tests := []struct {
		name     string
		org      string
		user     string
		resource shared.Resource
		action   shared.Action
		scope    *shared.ResourceScope
		want     bool
	}{
		{"user_1 creates entry on 123", org, "user_1", shared.ResourceLedgerEntry, shared.ActionCreate, fs123, true},
		{"user_1 updates entry on 123", org, "user_1", shared.ResourceLedgerEntry, shared.ActionUpdate, fs123, true},
		{"user_1 deletes entry on 123 (not granted)", org, "user_1", shared.ResourceLedgerEntry, shared.ActionDelete, fs123, false},
		{"user_1 creates entry on 125", org, "user_1", shared.ResourceLedgerEntry, shared.ActionCreate, fs125, false},
		{"user_1 creates entry without scope", org, "user_1", shared.ResourceLedgerEntry, shared.ActionCreate, nil, false},
		{"user_2 creates entry on 125", org, "user_2", shared.ResourceLedgerEntry, shared.ActionCreate, fs125, true},
		{"user_2 creates entry on 123", org, "user_2", shared.ResourceLedgerEntry, shared.ActionCreate, fs123, false},
		{"user_2 updates entry on 125 (not granted)", org, "user_2", shared.ResourceLedgerEntry, shared.ActionUpdate, fs125, false},
		{"same user id in another org", newOrg(), "user_1", shared.ResourceLedgerEntry, shared.ActionCreate, fs123, false},
		{"unscoped grant: no scope", org, "user_1", shared.ResourceFundSource, shared.ActionCreate, nil, true},
		{"unscoped grant covers any scope", org, "user_1", shared.ResourceFundSource, shared.ActionCreate, fs125, true},
		{"unscoped grant: other user", org, "user_2", shared.ResourceFundSource, shared.ActionCreate, nil, false},
		{"unscoped grant: other action", org, "user_1", shared.ResourceFundSource, shared.ActionUpdate, nil, false},
		{"unknown user", org, "user_3", shared.ResourceLedgerEntry, shared.ActionCreate, fs123, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := rm.HasGrant(ctx, models.HasGrantQuery{
				OrgID: tt.org, UserID: tt.user, Resource: tt.resource, Action: tt.action, Scope: tt.scope,
			})
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}

	t.Run("list filters by user and resource", func(t *testing.T) {
		views, err := rm.ListGrants(ctx, models.ListGrantsQuery{OrgID: org, UserID: "user_1"})
		require.NoError(t, err)
		assert.Len(t, views, 2)

		views, err = rm.ListGrants(ctx, models.ListGrantsQuery{OrgID: org, Resource: "ledger_entry"})
		require.NoError(t, err)
		assert.Len(t, views, 2)
	})
}
