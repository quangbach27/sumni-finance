package domain_test

import (
	"context"
	"errors"
	"testing"

	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/adapters/bankverifier"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

func newFactory(t *testing.T) (*domain.FundSourceFactory, *bankverifier.BankAccountVerifierStub) {
	t.Helper()

	stub := bankverifier.NewBankAccountVerifierStub()
	f, err := domain.NewFundSourceFactory(stub)
	require.NoError(t, err)

	return f, stub
}

func TestNewFundSourceFactory_NilVerifier(t *testing.T) {
	t.Parallel()

	f, err := domain.NewFundSourceFactory(nil)
	assert.Nil(t, f)
	assert.Error(t, err)
}

func TestCreateCashDetails(t *testing.T) {
	t.Parallel()

	f, _ := newFactory(t)

	d, err := f.CreateCashDetails("An")
	require.NoError(t, err)
	assert.Equal(t, domain.FundSourceTypeCash, d.Type())
	assert.Equal(t, "An", d.OwnerName())

	_, err = f.CreateCashDetails("  ")
	assert.Error(t, err)
}

type bankArgs struct {
	code      string
	bin       int32
	shortName string
	owner     string
	account   string
}

func TestCreateBankDetails(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		args        bankArgs
		vefifiedErr error
		wantErr     bool
	}{
		{
			name: "create successfully",
			args: bankArgs{"VCB", 970436, "Vietcombank", "An", "123"},
		},
		{
			name:    "reject blank bank code",
			args:    bankArgs{"", 970436, "Vietcombank", "An", "123"},
			wantErr: true,
		},
		{
			name:    "reject non-positive bank bin",
			args:    bankArgs{"VCB", 0, "Vietcombank", "An", "123"},
			wantErr: true,
		},
		{
			name:    "reject negative bank bin",
			args:    bankArgs{"VCB", -1, "Vietcombank", "An", "123"},
			wantErr: true,
		},
		{
			name:    "reject blank short name",
			args:    bankArgs{"VCB", 970436, "", "An", "123"},
			wantErr: true,
		},
		{
			name:    "reject blank owner",
			args:    bankArgs{"VCB", 970436, "Vietcombank", "", "123"},
			wantErr: true,
		},
		{
			name:    "reject blank account",
			args:    bankArgs{"VCB", 970436, "Vietcombank", "An", ""},
			wantErr: true,
		},
		{
			name:        "reject verifier error",
			args:        bankArgs{"VCB", 970436, "Vietcombank", "An", "123"},
			vefifiedErr: errors.New("not found"),
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			f, stub := newFactory(t)
			if tt.vefifiedErr != nil {
				stub.NextCallError(tt.vefifiedErr)
			}

			a := tt.args
			d, err := f.CreateBankDetails(context.Background(), a.code, a.bin, a.shortName, a.owner, a.account)
			if tt.wantErr {
				require.Error(t, err)
				assert.Nil(t, d)
				if tt.vefifiedErr == nil {
					var cErr common.Error
					require.ErrorAs(t, err, &cErr)
					assert.Len(t, cErr.Details, 1)
				}

				return
			}

			require.NoError(t, err)
			assert.Equal(t, domain.FundSourceTypeBank, d.Type())
			assert.Equal(t, a.code, d.BankCode())
			assert.Equal(t, a.bin, d.BankBin())
			assert.Equal(t, a.shortName, d.BankShortName())
			assert.Equal(t, a.owner, d.OwnerName())
			assert.Equal(t, a.account, d.AccountNumber())
		})
	}
}

func TestCreateFundSource(t *testing.T) {
	t.Parallel()

	f, _ := newFactory(t)
	cash, err := f.CreateCashDetails("An")
	require.NoError(t, err)
	vnd := common.MustEnum[shared.Currency]("VND")

	tests := []struct {
		name     string
		fsName   string
		balance  decimal.Decimal
		currency shared.Currency
		details  domain.FundSourceDetails
		wantErr  bool
	}{
		{
			name:     "create successfully",
			fsName:   "Wallet",
			balance:  decimal.NewFromInt(100),
			currency: vnd,
			details:  cash,
		},
		{
			name:     "create with zero balance successfully",
			fsName:   "Wallet",
			balance:  decimal.Zero,
			currency: vnd,
			details:  cash,
		},
		{
			name:     "reject blank name",
			fsName:   " ",
			balance:  decimal.Zero,
			currency: vnd,
			details:  cash,
			wantErr:  true,
		},
		{
			name:     "reject negative balance",
			fsName:   "Wallet",
			balance:  decimal.NewFromInt(-1),
			currency: vnd,
			details:  cash,
			wantErr:  true,
		},
		{
			name:    "reject zero currency",
			fsName:  "Wallet",
			balance: decimal.Zero,
			details: cash,
			wantErr: true,
		},
		{
			name:     "reject nil details",
			fsName:   "Wallet",
			balance:  decimal.Zero,
			currency: vnd,
			details:  nil,
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			fs, err := f.CreateFundSource(tt.fsName, tt.balance, tt.currency, tt.details)
			if tt.wantErr {
				require.Error(t, err)
				assert.Nil(t, fs)

				return
			}

			require.NoError(t, err)
			assert.False(t, fs.UUID().IsZero())
			assert.Equal(t, "Wallet", fs.Name())
			assert.True(t, tt.balance.Equal(fs.Balance()))
			assert.Equal(t, vnd, fs.Currency())
			assert.Equal(t, domain.FundSourceTypeCash, fs.Type())
			assert.Equal(t, tt.details, fs.Details())
		})
	}
}

func TestCreateBankDetails_TrimsInput(t *testing.T) {
	t.Parallel()

	f, _ := newFactory(t)
	d, err := f.CreateBankDetails(context.Background(), " VCB ", 1, " V ", " An ", " 123 ")
	require.NoError(t, err)
	assert.Equal(t, "VCB", d.BankCode())
	assert.Equal(t, "An", d.OwnerName())
	assert.Equal(t, "123", d.AccountNumber())
}

func TestCreateFundSource_TrimsName(t *testing.T) {
	t.Parallel()

	f, _ := newFactory(t)
	cash, err := f.CreateCashDetails(" An ")
	require.NoError(t, err)
	assert.Equal(t, "An", cash.OwnerName())

	fs, err := f.CreateFundSource("  Wallet ", decimal.Zero, common.MustEnum[shared.Currency]("VND"), cash)
	require.NoError(t, err)
	assert.Equal(t, "Wallet", fs.Name())
}
