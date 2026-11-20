//go:build component

package authorization_test

import (
	"context"
	"net/http"
	"testing"

	common "github.com/quangbach27/golang-common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	authzClients "backend/internal/authorization/ports/http/clients"
	"backend/internal/shared"
	apputils "backend/internal/utils"
	"backend/tests/utils"
)

var (
	admin      = shared.RoleOfficeAdmin
	accountant = shared.RoleOfficeAccountant
	viewer     = shared.RoleOfficeViewer
)

func TestGrantAccess(t *testing.T) {
	t.Run("admin grants an unscoped permission and it is listed", func(t *testing.T) {
		e := newEnv(t)

		resp := e.grantAccess(t, e.token(admin), createFundSourceGrant(userID(accountant)))
		require.Equal(t, http.StatusCreated, resp.StatusCode(), "body: %s", string(resp.Body))

		listed := e.listAccessGrants(t, e.token(admin), nil)
		require.Equal(t, http.StatusOK, listed.StatusCode(), "body: %s", string(listed.Body))
		require.Len(t, listed.JSON200.Items, 1)
		item := listed.JSON200.Items[0]
		assert.Equal(t, resp.JSON201.Uuid, item.Uuid)
		assert.Equal(t, userID(accountant), item.UserId)
		assert.Equal(t, shared.ResourceFundSource, item.Resource)
		assert.Equal(t, []authzClients.Action{shared.ActionCreate}, item.Actions)
		assert.Equal(t, userID(admin), item.GrantedBy)
		assert.Nil(t, item.Scope)
	})

	t.Run("admin grants a scoped permission", func(t *testing.T) {
		e := newEnv(t)

		resp := e.grantAccess(t, e.token(admin), scopedEntryGrant(userID(accountant), fundSourceScope(t, "123")))
		require.Equal(t, http.StatusCreated, resp.StatusCode(), "body: %s", string(resp.Body))

		items := e.listAccessGrants(t, e.token(admin), &authzClients.ListAccessGrantsParams{UserId: apputils.Ptr(userID(accountant))}).JSON200.Items
		require.Len(t, items, 1)
		require.NotNil(t, items[0].Scope)
		assert.Equal(t, "fund_source/123", items[0].Scope.String())
	})

	t.Run("accountant and viewer can't grant", func(t *testing.T) {
		e := newEnv(t)

		for _, role := range []shared.Role{accountant, viewer} {
			resp := e.grantAccess(t, e.token(role), createFundSourceGrant("u"))
			require.Equal(t, http.StatusForbidden, resp.StatusCode(), "role %s, body: %s", role, string(resp.Body))
			assert.Equal(t, "permission-denied", resp.JSON403.Slug)
		}
	})

	t.Run("duplicate grant conflicts", func(t *testing.T) {
		e := newEnv(t)

		require.Equal(t, http.StatusCreated, e.grantAccess(t, e.token(admin), createFundSourceGrant("u")).StatusCode())
		resp := e.grantAccess(t, e.token(admin), createFundSourceGrant("u"))
		require.Equal(t, http.StatusConflict, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "access-grant-already-exists", resp.JSON409.Slug)
	})

	t.Run("access_grant can't be granted", func(t *testing.T) {
		e := newEnv(t)

		body := createFundSourceGrant("u")
		body.Resource = shared.ResourceAccessGrant
		resp := e.grantAccess(t, e.token(admin), body)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "resource-not-grantable", resp.JSON400.Slug)
	})

	t.Run("invalid scope format is rejected", func(t *testing.T) {
		e := newEnv(t)

		resp := e.grantAccessRaw(t, e.token(admin),
			`{"user_id":"u","resource":"fund_source","actions":["create"],"scope":"nope"}`)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode(), "body: %s", string(resp.Body))
	})

	t.Run("empty actions are rejected", func(t *testing.T) {
		e := newEnv(t)

		body := createFundSourceGrant("u")
		body.Actions = []authzClients.Action{}
		resp := e.grantAccess(t, e.token(admin), body)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Equal(t, "actions-required", resp.JSON400.Slug)
	})
}

func TestIdentityMapping(t *testing.T) {
	t.Run("session without an organization is unauthorized", func(t *testing.T) {
		e := newEnv(t)

		token := utils.NewSession("admin-1", admin.String())
		resp := e.grantAccess(t, token, createFundSourceGrant("u"))
		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode(), "body: %s", string(resp.Body))
	})

	t.Run("unknown role is forbidden", func(t *testing.T) {
		e := newEnv(t)

		token := utils.NewOrgSession("x", e.org, "boss")
		resp := e.grantAccess(t, token, createFundSourceGrant("u"))
		assert.Equal(t, http.StatusForbidden, resp.StatusCode(), "body: %s", string(resp.Body))
	})
}

func TestListAccessGrants(t *testing.T) {
	t.Run("every role can list grants but only admins can change them", func(t *testing.T) {
		e := newEnv(t)

		granted := e.grantAccess(t, e.token(admin), scopedEntryGrant(userID(accountant), fundSourceScope(t, "123")))
		require.Equal(t, http.StatusCreated, granted.StatusCode(), "body: %s", string(granted.Body))

		for _, role := range []shared.Role{accountant, viewer} {
			resp := e.listAccessGrants(t, e.token(role), nil)
			require.Equal(t, http.StatusOK, resp.StatusCode(), "role %s, body: %s", role, string(resp.Body))
			require.Len(t, resp.JSON200.Items, 1, "role %s", role)
			assert.Equal(t, userID(accountant), resp.JSON200.Items[0].UserId)

			assert.Equal(t, http.StatusForbidden, e.grantAccess(t, e.token(role), createFundSourceGrant("u")).StatusCode(), "role %s", role)
			assert.Equal(t, http.StatusForbidden, e.revokeAccess(t, e.token(role), granted.JSON201.Uuid).StatusCode(), "role %s", role)
		}
	})

	t.Run("filters and org isolation", func(t *testing.T) {
		e := newEnv(t)
		otherOrgAdmin := tokenInOrg("admin-2", newOrgName(), admin)

		require.Equal(t, http.StatusCreated, e.grantAccess(t, e.token(admin), createFundSourceGrant("user_1")).StatusCode())
		require.Equal(t, http.StatusCreated, e.grantAccess(t, e.token(admin), createFundSourceGrant("user_2")).StatusCode())

		all := e.listAccessGrants(t, e.token(admin), nil).JSON200.Items
		assert.Len(t, all, 2)

		one := e.listAccessGrants(t, e.token(admin), &authzClients.ListAccessGrantsParams{UserId: apputils.Ptr("user_1")}).JSON200.Items
		require.Len(t, one, 1)
		assert.Equal(t, "user_1", one[0].UserId)

		none := e.listAccessGrants(t, e.token(admin), &authzClients.ListAccessGrantsParams{Resource: apputils.Ptr(shared.ResourceLedgerPeriod)}).JSON200.Items
		assert.Empty(t, none)

		// The typed client cannot build an unknown resource, so set the raw query value.
		setBadResource := func(_ context.Context, req *http.Request) error {
			q := req.URL.Query()
			q.Set("resource", "nope")
			req.URL.RawQuery = q.Encode()

			return nil
		}
		bad, err := e.clients.Authorization.ListAccessGrantsWithResponse(
			context.Background(), nil, utils.AuthEditorFn(e.token(admin)), setBadResource,
		)
		require.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, bad.StatusCode(), "body: %s", string(bad.Body))

		assert.Empty(t, e.listAccessGrants(t, otherOrgAdmin, nil).JSON200.Items, "other org must not see these grants")
	})
}

func TestUpdateAccessGrant(t *testing.T) {
	t.Run("update replaces the actions", func(t *testing.T) {
		e := newEnv(t)
		id := e.grantAccess(t, e.token(admin), createFundSourceGrant("u")).JSON201.Uuid

		resp := e.updateAccessGrant(t, e.token(admin), id, shared.ActionUpdate, shared.ActionDelete)
		require.Equal(t, http.StatusNoContent, resp.StatusCode(), "body: %s", string(resp.Body))

		items := e.listAccessGrants(t, e.token(admin), nil).JSON200.Items
		require.Len(t, items, 1)
		assert.Equal(t, []authzClients.Action{shared.ActionUpdate, shared.ActionDelete}, items[0].Actions)
	})

	t.Run("update validates and checks permission", func(t *testing.T) {
		e := newEnv(t)
		id := e.grantAccess(t, e.token(admin), createFundSourceGrant("u")).JSON201.Uuid

		empty := e.updateAccessGrant(t, e.token(admin), id)
		assert.Equal(t, http.StatusBadRequest, empty.StatusCode(), "body: %s", string(empty.Body))

		forbidden := e.updateAccessGrant(t, e.token(accountant), id, shared.ActionRead)
		assert.Equal(t, http.StatusForbidden, forbidden.StatusCode(), "body: %s", string(forbidden.Body))
	})

	t.Run("unknown grant is not found", func(t *testing.T) {
		e := newEnv(t)
		missing := authzClients.AccessGrantUUID{UUID: common.NewUUIDv7()}

		resp := e.updateAccessGrant(t, e.token(admin), missing, shared.ActionRead)
		assert.Equal(t, http.StatusNotFound, resp.StatusCode(), "body: %s", string(resp.Body))
	})
}

func TestRevokeAccess(t *testing.T) {
	t.Run("unknown grant is not found", func(t *testing.T) {
		e := newEnv(t)
		missing := authzClients.AccessGrantUUID{UUID: common.NewUUIDv7()}

		resp := e.revokeAccess(t, e.token(admin), missing)
		assert.Equal(t, http.StatusNotFound, resp.StatusCode(), "body: %s", string(resp.Body))
	})

	t.Run("revoke, and other orgs and roles can't touch it", func(t *testing.T) {
		e := newEnv(t)
		otherOrgAdmin := tokenInOrg("admin-2", newOrgName(), admin)
		id := e.grantAccess(t, e.token(admin), createFundSourceGrant("u")).JSON201.Uuid

		assert.Equal(t, http.StatusNotFound, e.revokeAccess(t, otherOrgAdmin, id).StatusCode())
		assert.Equal(t, http.StatusForbidden, e.revokeAccess(t, e.token(accountant), id).StatusCode())

		resp := e.revokeAccess(t, e.token(admin), id)
		require.Equal(t, http.StatusNoContent, resp.StatusCode(), "body: %s", string(resp.Body))
		assert.Empty(t, e.listAccessGrants(t, e.token(admin), nil).JSON200.Items)

		// A revoked grant can be granted again.
		assert.Equal(t, http.StatusCreated, e.grantAccess(t, e.token(admin), createFundSourceGrant("u")).StatusCode())
	})
}

func TestListRolePolicies(t *testing.T) {
	t.Run("every role can read the baseline policies", func(t *testing.T) {
		e := newEnv(t)

		for _, role := range []shared.Role{admin, accountant, viewer} {
			resp := e.listRolePolicies(t, e.token(role))
			require.Equal(t, http.StatusOK, resp.StatusCode(), "role %s, body: %s", role, string(resp.Body))
			require.Len(t, resp.JSON200.Items, 3)
		}
	})

	t.Run("policies match the role baseline", func(t *testing.T) {
		e := newEnv(t)

		byRole := map[shared.Role][]authzClients.PolicyRule{}
		for _, item := range e.listRolePolicies(t, e.token(viewer)).JSON200.Items {
			for _, policy := range item.Policies {
				byRole[item.Role] = append(byRole[item.Role], policy.Rules...)
			}
		}

		assert.Len(t, byRole[admin], len(shared.AllResources()))
		for _, rule := range byRole[admin] {
			assert.ElementsMatch(t, shared.AllActions(), rule.Actions, "admin on %s", rule.Resource)
		}

		for _, role := range []shared.Role{accountant, viewer} {
			resources := make([]shared.Resource, 0, len(byRole[role]))
			for _, rule := range byRole[role] {
				assert.Equal(t, []authzClients.Action{shared.ActionRead}, rule.Actions, "%s on %s", role, rule.Resource)
				resources = append(resources, rule.Resource)
			}
			assert.Contains(t, resources, shared.ResourceAccessGrant, "role %s", role)
			assert.Contains(t, resources, shared.ResourceLedgerEntry, "role %s", role)
		}
	})

	t.Run("a session without an organization is unauthorized", func(t *testing.T) {
		e := newEnv(t)

		noOrg := utils.NewSession("user-"+common.NewUUIDv7().String(), admin.String())
		resp := e.listRolePolicies(t, noOrg)
		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode(), "body: %s", string(resp.Body))
	})
}
