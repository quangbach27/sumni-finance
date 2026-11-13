package apps

import (
	"errors"

	"backend/internal/authorization/domain"
	"backend/internal/shared"
)

// The default policies are the baseline every user gets from their role. Anything
// beyond it is given per user through an AccessGrant. They are configuration, not
// domain logic, so they live here and are built with the validated domain constructors.

// administratorAccess allows every action on every resource.
func administratorAccess() (domain.Policy, error) {
	var errs []error

	rules := make([]domain.Rule, 0, len(shared.AllResources()))
	for _, resource := range shared.AllResources() {
		rule, err := domain.NewRule(resource, shared.AllActions()...)
		if err != nil {
			errs = append(errs, err)
			continue
		}

		rules = append(rules, rule)
	}

	if err := errors.Join(errs...); err != nil {
		return domain.Policy{}, err
	}

	return domain.NewPolicy("AdministratorAccess", rules...)
}

// readOnlyAccess allows read on ledger resources (not access grants).
func readOnlyAccess() (domain.Policy, error) {
	resources := []shared.Resource{
		shared.ResourceFundSource,
		shared.ResourceLedgerPeriod,
		shared.ResourceLedgerEntry,
		shared.ResourceLedgerCategory,
	}

	var errs []error

	rules := make([]domain.Rule, 0, len(resources))
	for _, resource := range resources {
		rule, err := domain.NewRule(resource, shared.ActionRead)
		if err != nil {
			errs = append(errs, err)
			continue
		}

		rules = append(rules, rule)
	}

	if err := errors.Join(errs...); err != nil {
		return domain.Policy{}, err
	}

	return domain.NewPolicy("ReadOnlyAccess", rules...)
}

// defaultRolePolicies maps each role to its baseline policies.
func defaultRolePolicies() (map[shared.Role][]domain.Policy, error) {
	admin, err := administratorAccess()
	if err != nil {
		return nil, err
	}

	readOnly, err := readOnlyAccess()
	if err != nil {
		return nil, err
	}

	return map[shared.Role][]domain.Policy{
		shared.RoleOfficeAdmin:      {admin},
		shared.RoleOfficeAccountant: {readOnly},
		shared.RoleOfficeViewer:     {readOnly},
	}, nil
}
