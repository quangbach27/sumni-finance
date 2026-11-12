package commands

import (
	"context"
	"errors"

	"backend/internal/authorization/apps"
	"backend/internal/authorization/apps/models"
	"backend/internal/authorization/domain"
	"backend/internal/shared"
)

type Handlers struct {
	grantRepo domain.AccessGrantRepository
	catalog   *apps.PolicyCatalog
}

func NewHandlers(
	grantRepo domain.AccessGrantRepository,
	catalog *apps.PolicyCatalog,
) (*Handlers, error) {
	var errs []error

	if grantRepo == nil {
		errs = append(errs, errors.New("access grant repository can't be nil"))
	}

	if catalog == nil {
		errs = append(errs, errors.New("policy catalog can't be nil"))
	}

	if len(errs) > 0 {
		return nil, errors.Join(errs...)
	}

	return &Handlers{grantRepo: grantRepo, catalog: catalog}, nil
}

// requireAccessGrantPermission checks that the actor may manage access grants.
func (h *Handlers) requireAccessGrantPermission(ctx context.Context, actor models.Principal, action shared.Action) error {
	return h.catalog.Authorize(ctx, actor, shared.ResourceAccessGrant, action, nil)
}
