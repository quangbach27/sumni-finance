package bankverifier_test

import (
	"context"
	"errors"
	"testing"

	common "github.com/quangbach27/golang-common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/adapters/bankverifier"
)

func TestBankAccountVerifierStub(t *testing.T) {
	ctx := context.Background()
	valid := bankverifier.BankAccount{BankCode: "VCB", AccountNumber: "123"}

	t.Run("empty list bypasses", func(t *testing.T) {
		v := bankverifier.NewBankAccountVerifierStub()
		require.NoError(t, v.Verify(ctx, "ANY", "999"))
	})

	t.Run("listed account passes, unlisted fails", func(t *testing.T) {
		v := bankverifier.NewBankAccountVerifierStub(valid)
		require.NoError(t, v.Verify(ctx, " VCB ", " 123 ")) // inputs are trimmed

		err := v.Verify(ctx, "VCB", "999")
		var cErr common.Error
		require.ErrorAs(t, err, &cErr)
		assert.Equal(t, "bank-account-invalid", cErr.ErrorSlug)
	})

	t.Run("AddValidAccounts appends", func(t *testing.T) {
		v := bankverifier.NewBankAccountVerifierStub(valid)
		v.AddValidAccounts(bankverifier.BankAccount{BankCode: "TCB", AccountNumber: "456"})
		require.NoError(t, v.Verify(ctx, "TCB", "456"))
		require.NoError(t, v.Verify(ctx, "VCB", "123"))
	})

	t.Run("SetValidAccounts with none returns to bypass", func(t *testing.T) {
		v := bankverifier.NewBankAccountVerifierStub(valid)
		v.SetValidAccounts()
		require.NoError(t, v.Verify(ctx, "ANY", "999"))
	})

	t.Run("NextCallError wins once", func(t *testing.T) {
		v := bankverifier.NewBankAccountVerifierStub(valid)
		boom := errors.New("boom")
		v.NextCallError(boom)
		require.ErrorIs(t, v.Verify(ctx, "VCB", "123"), boom)
		require.NoError(t, v.Verify(ctx, "VCB", "123"))
	})
}
