package domain_test

import (
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

func newFundSource(t *testing.T, balance int64) *domain.FundSource {
	t.Helper()

	f, _ := newFactory(t)
	details, err := f.CreateCashDetails("An")
	require.NoError(t, err)
	fs, err := f.CreateFundSource("An - Cash", decimal.NewFromInt(balance), shared.CurrencyVND, details)
	require.NoError(t, err)

	return fs
}

func TestFundSource_TopUp(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		amount  int64
		want    int64
		wantErr bool
	}{
		{"positive", 50, 150, false},
		{"zero", 0, 100, true},
		{"negative", -10, 100, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			fs := newFundSource(t, 100)
			snap, err := fs.TopUp(decimal.NewFromInt(tt.amount))

			assert.True(t, decimal.NewFromInt(tt.want).Equal(fs.Balance()))
			if tt.wantErr {
				assert.Error(t, err)
				assert.Equal(t, domain.FundSourceSnapshot{}, snap)
				return
			}

			assert.NoError(t, err)
			assert.Equal(t, fs.UUID(), snap.FundSourceUUID)
			assert.True(t, decimal.NewFromInt(100).Equal(snap.Balance))
			assert.True(t, decimal.NewFromInt(tt.want).Equal(snap.BalanceAfter))
		})
	}
}

func TestFundSource_Withdraw(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		amount  int64
		want    int64
		wantErr bool
	}{
		{"positive", 40, 60, false},
		{"exact balance", 100, 0, false},
		{"zero", 0, 100, true},
		{"negative", -10, 100, true},
		{"exceeds balance", 101, 100, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			fs := newFundSource(t, 100)
			snap, err := fs.Withdraw(decimal.NewFromInt(tt.amount))

			assert.True(t, decimal.NewFromInt(tt.want).Equal(fs.Balance()))
			if tt.wantErr {
				assert.Error(t, err)
				assert.Equal(t, domain.FundSourceSnapshot{}, snap)
				return
			}

			assert.NoError(t, err)
			assert.Equal(t, fs.UUID(), snap.FundSourceUUID)
			assert.True(t, decimal.NewFromInt(100).Equal(snap.Balance))
			assert.True(t, decimal.NewFromInt(tt.want).Equal(snap.BalanceAfter))
		})
	}
}
