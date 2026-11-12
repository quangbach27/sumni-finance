package commands

import (
	"context"

	"github.com/quangbach27/golang-common/log"

	"backend/internal/authorization/apps/models"
	"backend/internal/authorization/domain"
	"backend/internal/shared"
)

type UpdateAccessGrant struct {
	Actor   models.Principal
	UUID    domain.AccessGrantUUID
	Actions []shared.Action
}

// UpdateAccessGrant replaces the actions of a grant in the actor's organization.
func (h *Handlers) UpdateAccessGrant(ctx context.Context, cmd UpdateAccessGrant) error {
	if err := h.requireAccessGrantPermission(ctx, cmd.Actor, shared.ActionUpdate); err != nil {
		return err
	}

	err := h.grantRepo.UpdateAccessGrant(
		ctx,
		cmd.Actor.OrgID,
		cmd.UUID,
		func(_ context.Context, grant *domain.AccessGrant) error {
			return grant.ChangeActions(cmd.Actions)
		},
	)
	if err != nil {
		return err
	}

	log.FromContext(ctx).With(
		"access_grant_uuid", cmd.UUID.String(),
		"org_id", cmd.Actor.OrgID,
		"updated_by", cmd.Actor.UserID,
	).Info("access grant updated")

	return nil
}
