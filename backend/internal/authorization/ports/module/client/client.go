// Package client is the contract the authorization module exposes to other
// modules. Other modules depend on this package only. It has a single method,
// Authorize; access grants are managed through the module's HTTP API.
package client

import (
	"context"

	"github.com/quangbach27/golang-common/http/auth"

	"backend/internal/shared"
)

type AuthorizeRequest struct {
	// Session is the authenticated caller; the module maps it to user, org and role.
	Session  *auth.Session
	Resource shared.Resource
	Action   shared.Action
	// Scope narrows the request, e.g. creating a ledger entry on fund source 123.
	// Nil when the request is not scoped.
	Scope *shared.ResourceScope
}

// AuthorizeResponse is the verified identity behind an allowed request. Modules
// scope their data by OrgID instead of trusting an org id from the request.
type AuthorizeResponse struct {
	UserID string
	OrgID  string
}

type Authorization interface {
	// Authorize returns the verified identity when the principal may do the action, or a
	// 401/403 common.Error when not. Callers can return the error as is.
	Authorize(ctx context.Context, req AuthorizeRequest) (AuthorizeResponse, error)
}
