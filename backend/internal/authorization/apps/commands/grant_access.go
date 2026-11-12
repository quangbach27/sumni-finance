package commands

import (
	"context"

	"github.com/quangbach27/golang-common/log"

	"backend/internal/authorization/apps/models"
	"backend/internal/authorization/domain"
	"backend/internal/shared"
)

type GrantAccess struct {
	Actor    models.Principal
	UserID   string
	Resource shared.Resource
	Actions  []shared.Action
	// Scope is optional: nil grants the actions on every instance of Resource.
	Scope *shared.ResourceScope
}

// GrantAccess gives UserID extra actions on a resource, in the actor's organization.
func (h *Handlers) GrantAccess(ctx context.Context, cmd GrantAccess) (domain.AccessGrantUUID, error) {
	if err := h.requireAccessGrantPermission(ctx, cmd.Actor, shared.ActionCreate); err != nil {
		return domain.AccessGrantUUID{}, err
	}

	grant, err := domain.NewAccessGrant(
		cmd.Actor.OrgID,
		cmd.UserID,
		cmd.Resource,
		cmd.Actions,
		cmd.Scope,
		cmd.Actor.UserID,
	)
	if err != nil {
		return domain.AccessGrantUUID{}, err
	}

	if err := h.grantRepo.CreateAccessGrant(ctx, grant); err != nil {
		return domain.AccessGrantUUID{}, err
	}

	log.FromContext(ctx).With(
		"access_grant_uuid", grant.UUID().String(),
		"org_id", cmd.Actor.OrgID,
		"user_id", cmd.UserID,
		"resource", cmd.Resource.String(),
		"granted_by", cmd.Actor.UserID,
	).Info("access granted")

	return grant.UUID(), nil
}
