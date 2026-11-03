package bankverifier

import (
	"context"
	"sync"

	"backend/internal/ledgers/domain"
)

// BankAccountVerifierStub accepts every bank account unless NextCallError was armed.
type BankAccountVerifierStub struct {
	mu      sync.Mutex
	nextErr error
}

var _ domain.BankAccountVerifier = (*BankAccountVerifierStub)(nil)

func NewBankAccountVerifierStub() *BankAccountVerifierStub {
	return &BankAccountVerifierStub{}
}

// NextCallError makes the next Verify call return err. The call after that succeeds again.
func (v *BankAccountVerifierStub) NextCallError(err error) {
	v.mu.Lock()
	defer v.mu.Unlock()

	v.nextErr = err
}

func (v *BankAccountVerifierStub) Verify(ctx context.Context, bankCode, accountNumber string) error {
	v.mu.Lock()
	defer v.mu.Unlock()

	err := v.nextErr
	v.nextErr = nil

	return err
}
