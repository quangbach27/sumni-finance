package domain

import (
	"errors"
	"fmt"
	"slices"

	"backend/internal/shared"
)

// Rule allows a set of actions on a resource type.
type Rule struct {
	resource shared.Resource
	actions  []shared.Action
}

func NewRule(resource shared.Resource, actions ...shared.Action) (Rule, error) {
	r := Rule{resource: resource, actions: slices.Clone(actions)}
	if err := r.validate(); err != nil {
		return Rule{}, err
	}

	return r, nil
}

func (r Rule) validate() error {
	if r.resource.IsZero() {
		return errors.New("rule needs a resource")
	}

	if len(r.actions) == 0 {
		return fmt.Errorf("rule on %s needs at least one action", r.resource)
	}

	for _, a := range r.actions {
		if a.IsZero() {
			return fmt.Errorf("rule on %s has an empty action", r.resource)
		}
	}

	return nil
}

func (r Rule) allows(resource shared.Resource, action shared.Action) bool {
	return r.resource == resource && slices.Contains(r.actions, action)
}

// Policy is a named, reusable set of rules (e.g. ReadOnlyAccess).
type Policy struct {
	name  string
	rules []Rule
}

func NewPolicy(name string, rules ...Rule) (Policy, error) {
	if name == "" {
		return Policy{}, errors.New("policy needs a name")
	}

	for _, r := range rules {
		if err := r.validate(); err != nil {
			return Policy{}, fmt.Errorf("policy %s: %w", name, err)
		}
	}

	return Policy{name: name, rules: slices.Clone(rules)}, nil
}

func (p Policy) Name() string { return p.name }

// Allows reports whether one of the policy's rules permits the action on the resource type.
func (p Policy) Allows(resource shared.Resource, action shared.Action) bool {
	return slices.ContainsFunc(p.rules, func(r Rule) bool { return r.allows(resource, action) })
}
