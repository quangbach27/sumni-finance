package http

import (
	"context"
	"errors"

	"backend/internal/authorization/apps"
	"backend/internal/authorization/apps/commands"
	"backend/internal/authorization/apps/models"
	"backend/internal/authorization/ports/module"
	"backend/internal/shared"
)

// GrantLister is the read model used to list grants.
type GrantLister interface {
	ListGrants(ctx context.Context, q models.ListGrantsQuery) ([]models.GrantView, error)
}

type Handlers struct {
	commandHandlers *commands.Handlers
	catalog         *apps.PolicyCatalog
	grants          GrantLister
}

var _ StrictServerInterface = (*Handlers)(nil)

func NewHandlers(
	commandHandlers *commands.Handlers,
	catalog *apps.PolicyCatalog,
	grants GrantLister,
) (*Handlers, error) {
	var errs []error

	if commandHandlers == nil {
		errs = append(errs, errors.New("command handlers can't be nil"))
	}

	if catalog == nil {
		errs = append(errs, errors.New("policy catalog can't be nil"))
	}

	if grants == nil {
		errs = append(errs, errors.New("grant read model can't be nil"))
	}

	if len(errs) != 0 {
		return nil, errors.Join(errs...)
	}

	return &Handlers{
		commandHandlers: commandHandlers,
		catalog:         catalog,
		grants:          grants,
	}, nil
}

func Register(router EchoRouter, handlers *Handlers) {
	RegisterHandlers(
		router,
		NewStrictHandler(handlers, nil),
	)
}

func (h *Handlers) GrantAccess(ctx context.Context, request GrantAccessRequestObject) (GrantAccessResponseObject, error) {
	actor, err := module.PrincipalFromContext(ctx)
	if err != nil {
		return nil, err
	}

	body := request.Body

	id, err := h.commandHandlers.GrantAccess(ctx, commands.GrantAccess{
		Actor:    actor,
		UserID:   body.UserId,
		Resource: body.Resource,
		Actions:  body.Actions,
		Scope:    body.Scope,
	})
	if err != nil {
		return nil, err
	}

	return GrantAccess201JSONResponse{Uuid: id}, nil
}

func (h *Handlers) UpdateAccessGrant(ctx context.Context, request UpdateAccessGrantRequestObject) (UpdateAccessGrantResponseObject, error) {
	actor, err := module.PrincipalFromContext(ctx)
	if err != nil {
		return nil, err
	}

	err = h.commandHandlers.UpdateAccessGrant(ctx, commands.UpdateAccessGrant{
		Actor:   actor,
		UUID:    request.AccessGrantUuid,
		Actions: request.Body.Actions,
	})
	if err != nil {
		return nil, err
	}

	return UpdateAccessGrant204Response{}, nil
}

func (h *Handlers) RevokeAccess(ctx context.Context, request RevokeAccessRequestObject) (RevokeAccessResponseObject, error) {
	actor, err := module.PrincipalFromContext(ctx)
	if err != nil {
		return nil, err
	}

	err = h.commandHandlers.RevokeAccess(ctx, commands.RevokeAccess{
		Actor: actor,
		UUID:  request.AccessGrantUuid,
	})
	if err != nil {
		return nil, err
	}

	return RevokeAccess204Response{}, nil
}

func (h *Handlers) ListAccessGrants(ctx context.Context, request ListAccessGrantsRequestObject) (ListAccessGrantsResponseObject, error) {
	actor, err := module.PrincipalFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := h.catalog.Authorize(ctx, actor, shared.ResourceAccessGrant, shared.ActionRead, nil); err != nil {
		return nil, err
	}

	query := models.ListGrantsQuery{OrgID: actor.OrgID}
	if request.Params.UserId != nil {
		query.UserID = *request.Params.UserId
	}

	if resource := request.Params.Resource; resource != nil && !resource.IsZero() {
		query.Resource = resource.String()
	}

	views, err := h.grants.ListGrants(ctx, query)
	if err != nil {
		return nil, err
	}

	items := make([]AccessGrant, 0, len(views))
	for _, v := range views {
		items = append(items, toAccessGrant(v))
	}

	return ListAccessGrants200JSONResponse{Items: items}, nil
}

func toAccessGrant(v models.GrantView) AccessGrant {
	return AccessGrant{
		Uuid:      v.UUID,
		UserId:    v.UserID,
		Resource:  v.Resource,
		Actions:   v.Actions,
		Scope:     v.Scope,
		GrantedBy: v.GrantedBy,
		CreatedAt: v.CreatedAt,
		UpdatedAt: v.UpdatedAt,
	}
}

// ListRolePolicies returns the baseline policies of every role. It is static
// configuration, so any authenticated member of an organization may read it.
func (h *Handlers) ListRolePolicies(ctx context.Context, _ ListRolePoliciesRequestObject) (ListRolePoliciesResponseObject, error) {
	if _, err := module.PrincipalFromContext(ctx); err != nil {
		return nil, err
	}

	views := h.catalog.RolePolicies()
	items := make([]RolePolicies, 0, len(views))
	for _, v := range views {
		policies := make([]Policy, 0, len(v.Policies))
		for _, p := range v.Policies {
			rules := make([]PolicyRule, 0, len(p.Rules))
			for _, r := range p.Rules {
				rules = append(rules, PolicyRule{Resource: r.Resource, Actions: r.Actions})
			}

			policies = append(policies, Policy{Name: p.Name, Rules: rules})
		}

		items = append(items, RolePolicies{Role: v.Role, Policies: policies})
	}

	return ListRolePolicies200JSONResponse{Items: items}, nil
}
