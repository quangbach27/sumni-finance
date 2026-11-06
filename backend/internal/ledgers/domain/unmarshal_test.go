package domain_test

import (
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

func TestUnmarshalFundSource(t *testing.T) {
	t.Parallel()

	src := newFundSource(t, 100)
	details := domain.UnmarshalBankDetails("VCB", 970436, "Vietcombank", "An", "123456")

	fs := domain.UnmarshalFundSource(src.UUID(), "An - VCB", decimal.NewFromInt(7), shared.CurrencyVND, details)

	assert.Equal(t, src.UUID(), fs.UUID())
	assert.Equal(t, "An - VCB", fs.Name())
	assert.True(t, fs.Balance().Equal(decimal.NewFromInt(7)))
	assert.True(t, fs.Currency().Equal(shared.CurrencyVND.Enum))
	assert.True(t, fs.Type().Equal(domain.FundSourceTypeBank.Enum))

	bank, ok := fs.Details().(*domain.BankDetails)
	require.True(t, ok)
	assert.Equal(t, "VCB", bank.BankCode())
	assert.Equal(t, int32(970436), bank.BankBin())
	assert.Equal(t, "123456", bank.AccountNumber())

	cash := domain.UnmarshalFundSource(src.UUID(), "Cash", decimal.Zero, shared.CurrencyVND, domain.UnmarshalCashDetails("An"))
	assert.True(t, cash.Type().Equal(domain.FundSourceTypeCash.Enum))
}

func TestUnmarshalLedgerPeriod(t *testing.T) {
	t.Parallel()

	p, err := domain.NewLedgerPeriod("Nov", decimal.NewFromInt(10), time.Now(), time.Now().AddDate(0, 1, 0))
	require.NoError(t, err)

	got := domain.UnmarshalLedgerPeriod(
		p.UUID(), p.Name(), p.OpeningBalance(), nil, p.OpenDate(), p.CloseDate(), p.Status(), nil, nil, nil,
	)

	assert.Equal(t, p, got)
	assert.True(t, got.CanPostEntries())
}
