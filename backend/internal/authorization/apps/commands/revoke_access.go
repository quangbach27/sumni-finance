package commands

import (
	"context"

	"github.com/quangbach27/golang-common/log"

	"backend/internal/authorization/apps/models"
	"backend/internal/authorization/domain"
	"backend/internal/shared"
)

type RevokeAccess struct {
	Actor models.Principal
	UUID  domain.AccessGrantUUID
}

// RevokeAccess removes a grant in the actor's organization.
func (h *Handlers) RevokeAccess(ctx context.Context, cmd RevokeAccess) error {
	if err := h.requireAccessGrantPermission(ctx, cmd.Actor, shared.ActionDelete); err != nil {
		return err
	}

	if err := h.grantRepo.DeleteAccessGrant(ctx, cmd.Actor.OrgID, cmd.UUID); err != nil {
		return err
	}

	log.FromContext(ctx).With(
		"access_grant_uuid", cmd.UUID.String(),
		"org_id", cmd.Actor.OrgID,
		"revoked_by", cmd.Actor.UserID,
	).Info("access revoked")

	return nil
}
