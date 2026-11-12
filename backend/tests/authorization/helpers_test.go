//go:build component

package authorization_test

import (
	"context"
	"strings"
	"testing"

	common "github.com/quangbach27/golang-common"
	"github.com/stretchr/testify/require"

	authzClients "backend/internal/authorization/ports/http/clients"
	"backend/internal/shared"
	"backend/tests/utils"
)

// env is one isolated organization with a session per role. Every test builds its
// own env, so tests never see each other's grants. A test picks who makes a call by
// passing the role's token: e.token(shared.RoleOfficeAdmin), and so on.
type env struct {
	clients *utils.TestClients
	org     string
	tokens  map[shared.Role]string
}

func newOrgName() string { return "org-" + common.NewUUIDv7().String() }

// userID is the identity provider user id of the session registered for role.
func userID(role shared.Role) string {
	switch role {
	case shared.RoleOfficeAdmin:
		return "admin-1"
	case shared.RoleOfficeAccountant:
		return "accountant-1"
	default:
		return "viewer-1"
	}
}

func newEnv(t *testing.T) env {
	t.Helper()

	org := newOrgName()
	tokens := map[shared.Role]string{}
	for _, role := range []shared.Role{shared.RoleOfficeAdmin, shared.RoleOfficeAccountant, shared.RoleOfficeViewer} {
		tokens[role] = utils.NewOrgSession(userID(role), org, role.String())
	}

	return env{clients: utils.NewTestClients(t), org: org, tokens: tokens}
}

// token returns the bearer token of the session registered for role in this env's org.
func (e env) token(role shared.Role) string { return e.tokens[role] }

// tokenInOrg registers a session for a user of another organization, for isolation tests.
func tokenInOrg(user, org string, role shared.Role) string {
	return utils.NewOrgSession(user, org, role.String())
}

// Request bodies.

func createFundSourceGrant(user string) authzClients.GrantAccessJSONRequestBody {
	return authzClients.GrantAccessJSONRequestBody{
		UserId:   user,
		Resource: shared.ResourceFundSource,
		Actions:  []authzClients.Action{shared.ActionCreate},
	}
}

func scopedEntryGrant(user string, scope shared.ResourceScope) authzClients.GrantAccessJSONRequestBody {
	return authzClients.GrantAccessJSONRequestBody{
		UserId:   user,
		Resource: shared.ResourceLedgerEntry,
		Actions:  []authzClients.Action{shared.ActionCreate, shared.ActionUpdate},
		Scope:    &scope,
	}
}

func fundSourceScope(t *testing.T, id string) shared.ResourceScope {
	t.Helper()

	scope, err := shared.NewResourceScope(shared.ResourceFundSource, id)
	require.NoError(t, err)

	return scope
}

// One helper per HTTP endpoint. Each takes the caller's token and returns the typed
// client response so tests can assert on the status and the decoded body.

func (e env) grantAccess(t *testing.T, token string, body authzClients.GrantAccessJSONRequestBody) *authzClients.GrantAccessClientResponse {
	t.Helper()

	resp, err := e.clients.Authorization.GrantAccessWithResponse(context.Background(), body, utils.AuthEditorFn(token))
	require.NoError(t, err)

	return resp
}

// grantAccessRaw sends a raw JSON body, for requests the typed client cannot build.
func (e env) grantAccessRaw(t *testing.T, token, rawJSON string) *authzClients.GrantAccessClientResponse {
	t.Helper()

	resp, err := e.clients.Authorization.GrantAccessWithBodyWithResponse(
		context.Background(), "application/json", strings.NewReader(rawJSON), utils.AuthEditorFn(token),
	)
	require.NoError(t, err)

	return resp
}

func (e env) listAccessGrants(t *testing.T, token string, params *authzClients.ListAccessGrantsParams) *authzClients.ListAccessGrantsClientResponse {
	t.Helper()

	resp, err := e.clients.Authorization.ListAccessGrantsWithResponse(context.Background(), params, utils.AuthEditorFn(token))
	require.NoError(t, err)

	return resp
}

func (e env) updateAccessGrant(
	t *testing.T, token string, id authzClients.AccessGrantUUID, actions ...authzClients.Action,
) *authzClients.UpdateAccessGrantClientResponse {
	t.Helper()

	resp, err := e.clients.Authorization.UpdateAccessGrantWithResponse(
		context.Background(), id,
		authzClients.UpdateAccessGrantJSONRequestBody{Actions: actions},
		utils.AuthEditorFn(token),
	)
	require.NoError(t, err)

	return resp
}

func (e env) revokeAccess(t *testing.T, token string, id authzClients.AccessGrantUUID) *authzClients.RevokeAccessClientResponse {
	t.Helper()

	resp, err := e.clients.Authorization.RevokeAccessWithResponse(context.Background(), id, utils.AuthEditorFn(token))
	require.NoError(t, err)

	return resp
}
