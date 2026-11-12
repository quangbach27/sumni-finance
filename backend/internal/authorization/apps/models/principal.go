package models

import (
	common "github.com/quangbach27/golang-common"

	"backend/internal/shared"
)

// Principal is the caller identity the identity provider gives us: who the user is,
// which organization they act in, and their role. It is the actor of every use case
// and is built by HTTP handlers and by other modules calling the contract.
type Principal struct {
	UserID string
	OrgID  string
	Role   shared.Role
}

func NewPrincipal(userID, orgID string, role shared.Role) (Principal, error) {
	if userID == "" {
		return Principal{}, common.NewUnauthorizedError("user-id-required", "user id is required")
	}

	if orgID == "" {
		return Principal{}, common.NewUnauthorizedError("org-id-required", "organization is required")
	}

	if role.IsZero() {
		return Principal{}, common.NewForbiddenError("role-required", "a valid role is required")
	}

	return Principal{UserID: userID, OrgID: orgID, Role: role}, nil
}
