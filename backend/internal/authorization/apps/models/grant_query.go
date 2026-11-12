package models

import "backend/internal/shared"

// HasGrantQuery asks whether a user holds a grant that covers a request.
type HasGrantQuery struct {
	OrgID    string
	UserID   string
	Resource shared.Resource
	Action   shared.Action
	// Scope is the scope of the request. Nil only matches unscoped grants.
	Scope *shared.ResourceScope
}
