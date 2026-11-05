package domain_test

import (
	"testing"
	"time"

	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

func newEntry(t *testing.T) *domain.LedgerEntry {
	t.Helper()

	fs := newFundSource(t, 100)
	period := newPeriodUUID()
	cat := domain.CategoryUUID{}
	cat.UUID = fs.UUID().UUID // any non-zero uuid
	e, err := domain.NewLedgerEntry(
		period, fs.UUID(), decimal.NewFromInt(50), shared.DirectionOutflow,
		"  lunch  ", time.Now().Add(-time.Hour), &cat, nil,
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
		sub := domain.SubCategoryUUID{}

		_, err := domain.NewLedgerEntry(
			domain.LedgerPeriodUUID{}, domain.FundSourceUUID{}, decimal.Zero, shared.Direction{},
			"  ", time.Time{}, nil, &sub,
		)
		require.Error(t, err)
	})
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
