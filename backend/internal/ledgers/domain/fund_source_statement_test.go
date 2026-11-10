package domain_test

import (
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
)

func newStatement(t *testing.T) *domain.FundSourceStatement {
	t.Helper()

	fs := newFundSource(t, 100)
	s, err := domain.NewFundSourceStatement(newPeriodUUID(), fs.UUID(), decimal.NewFromInt(2990000))
	require.NoError(t, err)

	return s
}

func TestNewFundSourceStatement(t *testing.T) {
	t.Parallel()

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		s := newStatement(t)

		assert.False(t, s.UUID().IsZero())
		assert.True(t, s.OpeningBalance().Equal(decimal.NewFromInt(2990000)))
		assert.False(t, s.IsClosed())
		assert.False(t, s.IsReconciled())
		assert.Nil(t, s.ClosingBalance())
		assert.Nil(t, s.ActualBalance())
	})

	t.Run("invalid inputs", func(t *testing.T) {
		t.Parallel()

		_, err := domain.NewFundSourceStatement(domain.LedgerPeriodUUID{}, domain.FundSourceUUID{}, decimal.NewFromInt(-1))
		require.Error(t, err)
	})
}

func TestFundSourceStatement_Close(t *testing.T) {
	t.Parallel()

	s := newStatement(t)
	require.Error(t, s.Close(decimal.NewFromInt(-1)))
	assert.False(t, s.IsClosed())

	require.NoError(t, s.Close(decimal.NewFromInt(4310000)))
	assert.True(t, s.ClosingBalance().Equal(decimal.NewFromInt(4310000)))
}

func TestFundSourceStatement_Reconcile(t *testing.T) {
	t.Parallel()

	closed := func(t *testing.T) *domain.FundSourceStatement {
		t.Helper()
		s := newStatement(t)
		require.NoError(t, s.Close(decimal.NewFromInt(4310000)))
		return s
	}

	t.Run("matched", func(t *testing.T) {
		t.Parallel()
		s := closed(t)

		require.NoError(t, s.Reconcile(decimal.NewFromInt(4310000), "user-1"))
		assert.True(t, s.IsReconciled())
		assert.True(t, s.ActualBalance().Equal(decimal.NewFromInt(4310000)))
		assert.Equal(t, "user-1", *s.ReconciledBy())
		assert.NotNil(t, s.ReconciledAt())

		require.Error(t, s.Reconcile(decimal.NewFromInt(4310000), "user-1"))
	})

	t.Run("not closed", func(t *testing.T) {
		t.Parallel()
		s := newStatement(t)

		require.Error(t, s.Reconcile(decimal.NewFromInt(1), "user-1"))
		assert.False(t, s.IsReconciled())
	})

	t.Run("mismatch leaves entity unchanged", func(t *testing.T) {
		t.Parallel()
		s := closed(t)

		require.Error(t, s.Reconcile(decimal.NewFromInt(4210000), "user-1"))
		assert.False(t, s.IsReconciled())
		assert.Nil(t, s.ActualBalance())
		assert.Nil(t, s.ReconciledBy())
	})

	t.Run("negative actual and missing user", func(t *testing.T) {
		t.Parallel()
		s := closed(t)

		require.Error(t, s.Reconcile(decimal.NewFromInt(-1), "user-1"))
		require.Error(t, s.Reconcile(decimal.NewFromInt(4310000), ""))
		assert.False(t, s.IsReconciled())
	})
}
