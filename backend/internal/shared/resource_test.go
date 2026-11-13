package shared_test

import (
	"encoding/json"
	"testing"

	common "github.com/quangbach27/golang-common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/shared"
)

func TestNewResourceScope(t *testing.T) {
	t.Parallel()

	t.Run("valid", func(t *testing.T) {
		t.Parallel()
		scope, err := shared.NewResourceScope(shared.ResourceFundSource, "123")
		require.NoError(t, err)
		assert.Equal(t, shared.ResourceFundSource, scope.Resource())
		assert.Equal(t, "123", scope.ID())
		assert.Equal(t, "fund_source/123", scope.String())
	})

	t.Run("invalid", func(t *testing.T) {
		t.Parallel()
		_, err := shared.NewResourceScope(shared.Resource{}, "123")
		assert.Error(t, err)
		_, err = shared.NewResourceScope(shared.ResourceFundSource, "")
		assert.Error(t, err)
	})
}

func TestResourceScope_Text(t *testing.T) {
	t.Parallel()

	valid := []string{"fund_source/123", "ledger_period/01a1ce66-5450-7fdf-a1bf-e4227206af94", "fund_source/a/b"}
	for _, in := range valid {
		t.Run("valid "+in, func(t *testing.T) {
			t.Parallel()
			var scope shared.ResourceScope
			require.NoError(t, scope.UnmarshalText([]byte(in)))
			out, err := scope.MarshalText()
			require.NoError(t, err)
			assert.Equal(t, in, string(out))
		})
	}

	invalid := []string{"fund_source", "fund_source/", "/123", "nope/123"}
	for _, in := range invalid {
		t.Run("invalid "+in, func(t *testing.T) {
			t.Parallel()
			var scope shared.ResourceScope
			assert.Error(t, scope.UnmarshalText([]byte(in)))
		})
	}

	t.Run("empty is the zero value", func(t *testing.T) {
		t.Parallel()
		scope := shared.ResourceScope{}
		require.NoError(t, scope.UnmarshalText(nil))
		assert.True(t, scope.IsZero())
		assert.Equal(t, "", scope.String())
	})
}

func TestResourceScope_JSON(t *testing.T) {
	t.Parallel()

	type body struct {
		Scope *shared.ResourceScope `json:"scope,omitempty"`
	}

	scope, err := shared.NewResourceScope(shared.ResourceFundSource, "123")
	require.NoError(t, err)

	raw, err := json.Marshal(body{Scope: &scope})
	require.NoError(t, err)
	assert.JSONEq(t, `{"scope":"fund_source/123"}`, string(raw))

	var got body
	require.NoError(t, json.Unmarshal(raw, &got))
	assert.Equal(t, &scope, got.Scope)

	require.NoError(t, json.Unmarshal([]byte(`{}`), &got))
	assert.Error(t, json.Unmarshal([]byte(`{"scope":"nope"}`), &got))
}

func TestResourceScope_SQL(t *testing.T) {
	t.Parallel()

	scope, err := shared.NewResourceScope(shared.ResourceLedgerEntry, "x")
	require.NoError(t, err)

	v, err := scope.Value()
	require.NoError(t, err)
	assert.Equal(t, "ledger_entry/x", v)

	var got shared.ResourceScope
	require.NoError(t, got.Scan("ledger_entry/x"))
	assert.Equal(t, scope, got)
	require.NoError(t, got.Scan([]byte("ledger_entry/x")))
	assert.Equal(t, scope, got)
	require.NoError(t, got.Scan(nil))
	assert.True(t, got.IsZero())
	assert.Error(t, got.Scan(42))
}

func TestEnumParsing(t *testing.T) {
	t.Parallel()

	role, err := common.NewEnum[shared.Role]("office-accountant")
	require.NoError(t, err)
	assert.Equal(t, shared.RoleOfficeAccountant, role)

	_, err = common.NewEnum[shared.Role]("nope")
	assert.Error(t, err)

	assert.Len(t, shared.AllResources(), 5)
	assert.Len(t, shared.AllActions(), 4)
}
