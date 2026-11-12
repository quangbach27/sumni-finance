package module

import (
	"context"
	"errors"

	common "github.com/quangbach27/golang-common"
	"github.com/quangbach27/golang-common/http/auth"

	"backend/internal/authorization/apps"
	"backend/internal/authorization/apps/models"
	"backend/internal/authorization/ports/module/client"
	"backend/internal/shared"
)

// organizationKey is the identity provider claim that carries the org id.
const organizationKey = "organization"

// PrincipalFromSession maps the identity provider session to a Principal. A missing
// user or org is unauthorized; an empty or unknown role is forbidden. The module
// contract uses it on every call, and the HTTP port reuses it for the request session.
func PrincipalFromSession(session *auth.Session) (models.Principal, error) {
	if session == nil {
		return models.Principal{}, common.NewUnauthorizedError("session-required", "authentication is required")
	}

	orgID, _ := session.Extra[organizationKey].(string)

	role, err := common.NewEnum[shared.Role](session.Role)
	if err != nil {
		return models.Principal{}, common.NewForbiddenError("unknown-role", "role %q is not recognized", session.Role)
	}

	return models.NewPrincipal(session.Subject, orgID, role)
}

// PrincipalFromContext builds the Principal of the authenticated request.
func PrincipalFromContext(ctx context.Context) (models.Principal, error) {
	session, ok := auth.SessionFromContext(ctx)
	if !ok {
		return models.Principal{}, common.NewUnauthorizedError("session-required", "authentication is required")
	}

	return PrincipalFromSession(session)
}

type Authorization struct {
	catalog *apps.PolicyCatalog
}

var _ client.Authorization = (*Authorization)(nil)

func NewAuthorization(catalog *apps.PolicyCatalog) (*Authorization, error) {
	if catalog == nil {
		return nil, errors.New("policy catalog can't be nil")
	}

	return &Authorization{catalog: catalog}, nil
}

func (a *Authorization) Authorize(ctx context.Context, req client.AuthorizeRequest) error {
	p, err := PrincipalFromSession(req.Session)
	if err != nil {
		return err
	}

	return a.catalog.Authorize(ctx, p, req.Resource, req.Action, req.Scope)
}
