package bankverifier

import (
	"context"
	"strings"
	"sync"

	common "github.com/quangbach27/golang-common"
	"github.com/quangbach27/golang-common/log"

	"backend/internal/ledgers/domain"
)

// BankAccount identifies a bank account the stub treats as valid.
type BankAccount struct {
	BankCode      string
	AccountNumber string
}

func (a BankAccount) key() string {
	return strings.TrimSpace(a.BankCode) + "|" + strings.TrimSpace(a.AccountNumber)
}

// BankAccountVerifierStub verifies accounts against a list of valid accounts.
//
//   - NextCallError armed: the next Verify returns that error.
//   - Valid list empty: verification is bypassed (accepts everything) and a warning is logged.
//   - Valid list non-empty: only listed accounts pass; others get a bank-account-invalid error.
type BankAccountVerifierStub struct {
	mu            sync.Mutex
	nextErr       error
	validAccounts map[string]struct{}
}

var _ domain.BankAccountVerifier = (*BankAccountVerifierStub)(nil)

func NewBankAccountVerifierStub(validAccounts ...BankAccount) *BankAccountVerifierStub {
	v := &BankAccountVerifierStub{}
	v.SetValidAccounts(validAccounts...)

	return v
}

// NextCallError makes the next Verify call return err. The call after that succeeds again.
func (v *BankAccountVerifierStub) NextCallError(err error) {
	v.mu.Lock()
	defer v.mu.Unlock()

	v.nextErr = err
}

// SetValidAccounts replaces the list of valid accounts. Calling it with no arguments
// clears the list, which switches the stub back to bypass mode.
func (v *BankAccountVerifierStub) SetValidAccounts(accounts ...BankAccount) {
	v.mu.Lock()
	defer v.mu.Unlock()

	v.validAccounts = make(map[string]struct{}, len(accounts))
	for _, a := range accounts {
		v.validAccounts[a.key()] = struct{}{}
	}
}

// AddValidAccounts appends accounts to the list of valid accounts.
func (v *BankAccountVerifierStub) AddValidAccounts(accounts ...BankAccount) {
	v.mu.Lock()
	defer v.mu.Unlock()

	if v.validAccounts == nil {
		v.validAccounts = make(map[string]struct{}, len(accounts))
	}
	for _, a := range accounts {
		v.validAccounts[a.key()] = struct{}{}
	}
}

func (v *BankAccountVerifierStub) Verify(ctx context.Context, bankCode, accountNumber string) error {
	v.mu.Lock()
	defer v.mu.Unlock()

	if err := v.nextErr; err != nil {
		v.nextErr = nil
		return err
	}

	if len(v.validAccounts) == 0 {
		log.FromContext(ctx).Warn(
			"bank account verifier stub has no valid accounts configured; bypassing verification",
			"bankCode", bankCode,
			"accountNumber", accountNumber,
		)

		return nil
	}

	if _, ok := v.validAccounts[BankAccount{BankCode: bankCode, AccountNumber: accountNumber}.key()]; !ok {
		return common.NewInvalidInputError(
			"bank-account-invalid",
			"This bank account is not registered as valid. Please contact your finance admin to have it added, then try again.",
		)
	}

	return nil
}
