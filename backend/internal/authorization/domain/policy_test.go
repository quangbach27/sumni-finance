package domain_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/authorization/domain"
	"backend/internal/shared"
)

func TestPolicy_Allows(t *testing.T) {
	t.Parallel()

	read, err := domain.NewRule(shared.ResourceFundSource, shared.ActionRead)
	require.NoError(t, err)
	edit, err := domain.NewRule(shared.ResourceLedgerEntry, shared.ActionCreate, shared.ActionUpdate)
	require.NoError(t, err)

	policy, err := domain.NewPolicy("Mixed", read, edit)
	require.NoError(t, err)
	assert.Equal(t, "Mixed", policy.Name())

	empty, err := domain.NewPolicy("Empty")
	require.NoError(t, err)

	tests := []struct {
		name     string
		policy   domain.Policy
		resource shared.Resource
		action   shared.Action
		want     bool
	}{
		{"matching rule", policy, shared.ResourceFundSource, shared.ActionRead, true},
		{"second action of a rule", policy, shared.ResourceLedgerEntry, shared.ActionUpdate, true},
		{"wrong action", policy, shared.ResourceFundSource, shared.ActionCreate, false},
		{"wrong resource", policy, shared.ResourceLedgerPeriod, shared.ActionRead, false},
		{"empty policy", empty, shared.ResourceFundSource, shared.ActionRead, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tt.want, tt.policy.Allows(tt.resource, tt.action))
		})
	}
}

func TestNewRuleAndPolicy_Validation(t *testing.T) {
	t.Parallel()

	t.Run("rule without actions", func(t *testing.T) {
		t.Parallel()
		_, err := domain.NewRule(shared.ResourceFundSource)
		assert.Error(t, err)
	})

	t.Run("rule without resource", func(t *testing.T) {
		t.Parallel()
		_, err := domain.NewRule(shared.Resource{}, shared.ActionRead)
		assert.Error(t, err)
	})

	t.Run("rule with empty action", func(t *testing.T) {
		t.Parallel()
		_, err := domain.NewRule(shared.ResourceFundSource, shared.Action{})
		assert.Error(t, err)
	})

	t.Run("policy without name", func(t *testing.T) {
		t.Parallel()
		_, err := domain.NewPolicy("")
		assert.Error(t, err)
	})
}
