package models

import (
	"time"

	"backend/internal/authorization/domain"
	"backend/internal/shared"
)

type ListGrantsQuery struct {
	OrgID string
	// UserID and Resource are optional filters; empty means no filter.
	UserID   string
	Resource string
}

// GrantView is the read model of an access grant.
type GrantView struct {
	UUID      domain.AccessGrantUUID
	UserID    string
	Resource  shared.Resource
	Actions   []shared.Action
	Scope     *shared.ResourceScope
	GrantedBy string
	CreatedAt time.Time
	UpdatedAt time.Time
}
