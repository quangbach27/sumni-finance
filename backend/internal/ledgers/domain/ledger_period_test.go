package domain_test

import (
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
)

func newPeriod(t *testing.T) *domain.LedgerPeriod {
	t.Helper()

	open := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	p, err := domain.NewLedgerPeriod("  Jan 2026 ", decimal.NewFromInt(100), open, open.AddDate(0, 1, 0))
	require.NoError(t, err)

	return p
}

func TestNewLedgerPeriod(t *testing.T) {
	t.Parallel()

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		p := newPeriod(t)

		assert.False(t, p.UUID().IsZero())
		assert.Equal(t, "Jan 2026", p.Name())
		assert.True(t, p.OpeningBalance().Equal(decimal.NewFromInt(100)))
		assert.True(t, p.IsOpened())
		assert.True(t, p.CanPostEntries())
	})

	t.Run("invalid inputs", func(t *testing.T) {
		t.Parallel()

		_, err := domain.NewLedgerPeriod(" ", decimal.NewFromInt(-1), time.Time{}, time.Time{})
		require.Error(t, err)

		now := time.Now()
		_, err = domain.NewLedgerPeriod("p", decimal.Zero, now, now.Add(-time.Hour))
		require.Error(t, err)
	})
}

func TestLedgerPeriod_Lifecycle(t *testing.T) {
	t.Parallel()

	t.Run("open, close, reopen, close, reconcile", func(t *testing.T) {
		t.Parallel()
		p := newPeriod(t)

		require.NoError(t, p.Close())
		assert.True(t, p.IsClosed())
		assert.False(t, p.CanPostEntries())

		require.NoError(t, p.Reopen(" cash is off "))
		assert.True(t, p.IsOpened())
		assert.True(t, p.CanPostEntries())
		assert.Equal(t, "cash is off", *p.ReopenReason())
		assert.NotNil(t, p.ReopenedAt())

		require.NoError(t, p.Close())
		assert.Nil(t, p.ClosingBalance())
		require.NoError(t, p.Reconcile(decimal.NewFromInt(150)))
		assert.True(t, p.ClosingBalance().Equal(decimal.NewFromInt(150)))
		assert.True(t, p.IsReconciled())
		assert.NotNil(t, p.ReconciledAt())
		assert.False(t, p.CanPostEntries())
	})

	t.Run("illegal transitions leave status unchanged", func(t *testing.T) {
		t.Parallel()
		p := newPeriod(t)

		require.Error(t, p.Reopen("r"))
		require.Error(t, p.Reconcile(decimal.Zero))
		assert.True(t, p.IsOpened())

		require.NoError(t, p.Close())
		require.Error(t, p.Close())
		require.Error(t, p.Reopen("  "))
		assert.True(t, p.IsClosed())
		assert.Nil(t, p.ReopenReason())
	})

	t.Run("negative closing balance is rejected", func(t *testing.T) {
		t.Parallel()
		p := newPeriod(t)
		require.NoError(t, p.Close())

		require.Error(t, p.Reconcile(decimal.NewFromInt(-1)))
		assert.True(t, p.IsClosed())
		assert.Nil(t, p.ClosingBalance())
	})

	t.Run("reconciled is locked", func(t *testing.T) {
		t.Parallel()
		p := newPeriod(t)
		require.NoError(t, p.Close())
		require.NoError(t, p.Reconcile(decimal.Zero))

		require.Error(t, p.Close())
		require.Error(t, p.Reopen("r"))
		require.Error(t, p.Reconcile(decimal.Zero))
		assert.True(t, p.IsReconciled())
	})
}
