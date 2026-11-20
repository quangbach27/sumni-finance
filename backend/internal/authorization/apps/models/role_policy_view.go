package models

import "backend/internal/shared"

// RolePolicyView is the read model of the baseline policies of one role.
type RolePolicyView struct {
	Role     shared.Role
	Policies []PolicyView
}

type PolicyView struct {
	Name  string
	Rules []RuleView
}

type RuleView struct {
	Resource shared.Resource
	Actions  []shared.Action
}
