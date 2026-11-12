package domain

import (
	"slices"

	common "github.com/quangbach27/golang-common"

	"backend/internal/shared"
)

type AccessGrantUUID struct {
	common.UUID
}

// AccessGrant gives one user extra actions on a resource type, on top of what the
// user's role allows. With a scope the grant only applies to requests made in that
// scope (e.g. ledger entries of fund source 123); without one it applies everywhere.
type AccessGrant struct {
	uuid      AccessGrantUUID
	orgID     string
	userID    string
	resource  shared.Resource
	actions   []shared.Action
	scope     *shared.ResourceScope
	grantedBy string
}

func (g *AccessGrant) UUID() AccessGrantUUID        { return g.uuid }
func (g *AccessGrant) OrgID() string                { return g.orgID }
func (g *AccessGrant) UserID() string               { return g.userID }
func (g *AccessGrant) Resource() shared.Resource    { return g.resource }
func (g *AccessGrant) Actions() []shared.Action     { return slices.Clone(g.actions) }
func (g *AccessGrant) Scope() *shared.ResourceScope { return g.scope }
func (g *AccessGrant) GrantedBy() string            { return g.grantedBy }
func (g *AccessGrant) Covers(a shared.Action) bool  { return slices.Contains(g.actions, a) }

func NewAccessGrant(
	orgID, userID string,
	resource shared.Resource,
	actions []shared.Action,
	scope *shared.ResourceScope,
	grantedBy string,
) (*AccessGrant, error) {
	if orgID == "" {
		return nil, common.NewInvalidInputError("org-id-required", "org id is required")
	}

	if userID == "" {
		return nil, common.NewInvalidInputError("user-id-required", "user id is required")
	}

	if grantedBy == "" {
		return nil, common.NewInvalidInputError("granted-by-required", "granted by is required")
	}

	if resource.IsZero() {
		return nil, common.NewInvalidInputError("resource-required", "resource is required")
	}

	// Letting a user hold access_grant through a grant would allow privilege
	// escalation; only roles may manage grants.
	if resource == shared.ResourceAccessGrant {
		return nil, common.NewInvalidInputError("resource-not-grantable", "resource %q can't be granted", resource)
	}

	normalized, err := normalizeActions(actions)
	if err != nil {
		return nil, err
	}

	if scope != nil && scope.IsZero() {
		return nil, common.NewInvalidInputError("invalid-grant-scope", "grant scope is invalid")
	}

	return &AccessGrant{
		uuid:      AccessGrantUUID{common.NewUUIDv7()},
		orgID:     orgID,
		userID:    userID,
		resource:  resource,
		actions:   normalized,
		scope:     scope,
		grantedBy: grantedBy,
	}, nil
}

// ChangeActions replaces the action set.
func (g *AccessGrant) ChangeActions(actions []shared.Action) error {
	normalized, err := normalizeActions(actions)
	if err != nil {
		return err
	}

	g.actions = normalized
	return nil
}

// UnmarshalAccessGrantFromDB rebuilds a stored grant without validation.
func UnmarshalAccessGrantFromDB(
	uuid AccessGrantUUID,
	orgID, userID string,
	resource shared.Resource,
	actions []shared.Action,
	scope *shared.ResourceScope,
	grantedBy string,
) *AccessGrant {
	return &AccessGrant{
		uuid:      uuid,
		orgID:     orgID,
		userID:    userID,
		resource:  resource,
		actions:   actions,
		scope:     scope,
		grantedBy: grantedBy,
	}
}

// normalizeActions validates the actions and removes duplicates, keeping order.
func normalizeActions(actions []shared.Action) ([]shared.Action, error) {
	if len(actions) == 0 {
		return nil, common.NewInvalidInputError("actions-required", "at least one action is required")
	}

	out := make([]shared.Action, 0, len(actions))
	for _, a := range actions {
		if a.IsZero() {
			return nil, common.NewInvalidInputError("action-required", "action can't be empty")
		}

		if !slices.Contains(out, a) {
			out = append(out, a)
		}
	}

	return out, nil
}
