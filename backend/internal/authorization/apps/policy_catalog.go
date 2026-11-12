package apps

import (
	"context"
	"errors"
	"fmt"
	"slices"

	common "github.com/quangbach27/golang-common"

	"backend/internal/authorization/apps/models"
	"backend/internal/authorization/domain"
	"backend/internal/shared"
)

// GrantReadModel looks up per-user access grants. It is implemented by the read
// model in adapters/db.
type GrantReadModel interface {
	HasGrant(ctx context.Context, q models.HasGrantQuery) (bool, error)
}

// PolicyCatalog decides what a principal may do: first from the policies of the
// principal's role, then from the access grants of that user.
type PolicyCatalog struct {
	byRole map[shared.Role][]domain.Policy
	grants GrantReadModel
}

// NewDefaultPolicyCatalog builds a catalog with the default role policies:
// office-admin can do everything; office-accountant and office-viewer can read.
func NewDefaultPolicyCatalog(grants GrantReadModel) (*PolicyCatalog, error) {
	byRole, err := defaultRolePolicies()
	if err != nil {
		return nil, fmt.Errorf("build default policies: %w", err)
	}

	return NewPolicyCatalog(byRole, grants)
}

func NewPolicyCatalog(byRole map[shared.Role][]domain.Policy, grants GrantReadModel) (*PolicyCatalog, error) {
	var errs []error

	if grants == nil {
		errs = append(errs, errors.New("grant read model can't be nil"))
	}

	copied := make(map[shared.Role][]domain.Policy, len(byRole))
	for role, policies := range byRole {
		if role.IsZero() {
			errs = append(errs, errors.New("policy catalog has an empty role key"))
			continue
		}

		copied[role] = slices.Clone(policies)
	}

	if err := errors.Join(errs...); err != nil {
		return nil, fmt.Errorf("invalid policy catalog: %w", err)
	}

	return &PolicyCatalog{byRole: copied, grants: grants}, nil
}

// Authorize returns nil when the principal may do the action on the resource, and a
// 403 `permission-denied` error when not. The role is checked first (no DB lookup);
// otherwise the user's own grants are consulted, keyed by org, user, resource and scope.
func (c *PolicyCatalog) Authorize(
	ctx context.Context,
	principal models.Principal,
	resource shared.Resource,
	action shared.Action,
	scope *shared.ResourceScope,
) error {
	if principal.UserID == "" || principal.OrgID == "" || principal.Role.IsZero() {
		return common.NewUnauthorizedError("invalid-principal", "a user, an organization and a role are required")
	}

	if resource.IsZero() || action.IsZero() {
		return common.NewInvalidInputError("resource-and-action-required", "resource and action are required")
	}

	if c.roleAllows(principal.Role, resource, action) {
		return nil
	}

	ok, err := c.grants.HasGrant(ctx, models.HasGrantQuery{
		OrgID:    principal.OrgID,
		UserID:   principal.UserID,
		Resource: resource,
		Action:   action,
		Scope:    scope,
	})
	if err != nil {
		return err
	}

	if !ok {
		return common.NewForbiddenError("permission-denied", "you are not allowed to %s %s", action, resource)
	}

	return nil
}

func (c *PolicyCatalog) roleAllows(role shared.Role, resource shared.Resource, action shared.Action) bool {
	return slices.ContainsFunc(c.byRole[role], func(p domain.Policy) bool { return p.Allows(resource, action) })
}
