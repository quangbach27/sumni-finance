package domain_test

import (
	"testing"
	"time"

	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/apps/models"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

func newEntry(t *testing.T) *domain.LedgerEntry {
	t.Helper()

	fs := newFundSource(t, 100)
	period := newPeriodUUID()
	cat := models.CategoryUUID{}
	cat.UUID = fs.UUID().UUID // any non-zero uuid
	e, err := domain.NewLedgerEntry(
		period, fs.UUID(), decimal.NewFromInt(50), shared.DirectionOutflow,
		"  lunch  ", time.Now().Add(-time.Hour), &cat,
	)
	require.NoError(t, err)

	return e
}

func TestNewLedgerEntry(t *testing.T) {
	t.Parallel()

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		e := newEntry(t)

		assert.False(t, e.UUID().IsZero())
		assert.False(t, e.LedgerPeriodUUID().IsZero())
		assert.Equal(t, "lunch", e.Description())
		assert.True(t, e.Status().Equal(domain.EntryStatusPosted.Enum))
		assert.True(t, e.Kind().Equal(domain.EntryKindNormal.Enum))
		assert.False(t, e.IsVoided())
		assert.False(t, e.IsReversed())
		assert.Nil(t, e.ReversedByEntryID())
		assert.Nil(t, e.VoidedReason())
	})

	t.Run("invalid inputs", func(t *testing.T) {
		t.Parallel()
		_, err := domain.NewLedgerEntry(
			domain.LedgerPeriodUUID{}, domain.FundSourceUUID{}, decimal.Zero, shared.Direction{},
			"  ", time.Time{}, nil,
		)
		require.Error(t, err)
	})
}

func TestLedgerEntry_IsInflowOutflow(t *testing.T) {
	t.Parallel()

	e := newEntry(t) // outflow
	assert.True(t, e.IsOutflow())
	assert.False(t, e.IsInflow())

	reversal, err := e.Void("mistake", "user-1")
	require.NoError(t, err)
	assert.True(t, reversal.IsInflow())
	assert.False(t, reversal.IsOutflow())
}

func TestLedgerEntry_Void(t *testing.T) {
	t.Parallel()

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		e := newEntry(t)

		rev, err := e.Void(" wrong amount ", "user-1")
		require.NoError(t, err)

		assert.True(t, e.IsVoided())
		assert.True(t, e.IsReversed())
		assert.Equal(t, "wrong amount", *e.VoidedReason())
		assert.Equal(t, "user-1", *e.VoidedBy())
		assert.NotNil(t, e.VoidedAt())
		assert.Equal(t, rev.UUID(), *e.ReversedByEntryID())

		assert.True(t, rev.IsReversal())
		assert.False(t, rev.IsVoided())
		assert.Equal(t, e.UUID(), *rev.ReversesEntryID())
		assert.Equal(t, e.LedgerPeriodUUID(), rev.LedgerPeriodUUID())
		assert.Equal(t, e.FundSourceUUID(), rev.FundSourceUUID())
		assert.True(t, e.Amount().Equal(rev.Amount()))
		assert.True(t, rev.Direction().Equal(shared.DirectionInflow.Enum))
		assert.Equal(t, e.CategoryUUID(), rev.CategoryUUID())
	})

	t.Run("errors leave entry unchanged", func(t *testing.T) {
		t.Parallel()
		e := newEntry(t)

		rev, err := e.Void(" ", "")
		require.Error(t, err)
		assert.Nil(t, rev)
		assert.False(t, e.IsVoided())
		assert.Nil(t, e.ReversedByEntryID())
	})

	t.Run("cannot void twice", func(t *testing.T) {
		t.Parallel()
		e := newEntry(t)
		_, err := e.Void("r", "u")
		require.NoError(t, err)

		_, err = e.Void("r", "u")
		require.Error(t, err)
	})

	t.Run("cannot void a reversal", func(t *testing.T) {
		t.Parallel()
		e := newEntry(t)
		rev, err := e.Void("r", "u")
		require.NoError(t, err)

		_, err = rev.Void("r", "u")
		require.Error(t, err)
		assert.False(t, rev.IsVoided())
	})
}

func newPeriodUUID() domain.LedgerPeriodUUID {
	return domain.LedgerPeriodUUID{UUID: common.NewUUIDv7()}
}

func TestLedgerEntry_RecordFundSourceSnapshot(t *testing.T) {
	t.Parallel()

	t.Run("records the snapshot once", func(t *testing.T) {
		t.Parallel()
		e := newEntry(t)
		assert.False(t, e.HasFundSourceSnapshot())

		snap := domain.FundSourceSnapshot{
			FundSourceUUID: e.FundSourceUUID(),
			Balance:        decimal.NewFromInt(100),
			BalanceAfter:   decimal.NewFromInt(50),
		}
		require.NoError(t, e.RecordFundSourceSnapshot(snap))

		assert.True(t, e.HasFundSourceSnapshot())
		assert.True(t, e.FundSourceBalanceBefore().Equal(decimal.NewFromInt(100)))
		assert.True(t, e.FundSourceBalanceAfter().Equal(decimal.NewFromInt(50)))

		err := e.RecordFundSourceSnapshot(snap)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "fund-source-snapshot-already-recorded")
	})

	t.Run("rejects a snapshot of another fund source", func(t *testing.T) {
		t.Parallel()
		e := newEntry(t)
		other := newFundSource(t, 100)

		err := e.RecordFundSourceSnapshot(domain.FundSourceSnapshot{
			FundSourceUUID: other.UUID(),
			Balance:        decimal.NewFromInt(100),
			BalanceAfter:   decimal.NewFromInt(50),
		})
		require.Error(t, err)
		assert.Contains(t, err.Error(), "snapshot-fund-source-mismatch")
		assert.False(t, e.HasFundSourceSnapshot())
	})

	t.Run("works with the snapshot returned by Withdraw", func(t *testing.T) {
		t.Parallel()
		fs := newFundSource(t, 100)
		period := newPeriodUUID()

		e, err := domain.NewLedgerEntry(
			period, fs.UUID(), decimal.NewFromInt(30), shared.DirectionOutflow,
			"lunch", time.Now().Add(-time.Hour), nil,
		)
		require.NoError(t, err)

		snap, err := fs.Withdraw(e.Amount())
		require.NoError(t, err)
		require.NoError(t, e.RecordFundSourceSnapshot(snap))

		assert.True(t, e.FundSourceBalanceBefore().Equal(decimal.NewFromInt(100)))
		assert.True(t, e.FundSourceBalanceAfter().Equal(decimal.NewFromInt(70)))
	})
}
