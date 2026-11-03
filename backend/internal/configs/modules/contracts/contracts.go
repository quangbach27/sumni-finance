package contracts

import (
	"errors"

	ledgerClient "backend/internal/ledgers/ports/module/client"
)

type Contracts struct {
	ledgerClient.Ledger
}

// Verify checks that every module has registered its contract.
func (c *Contracts) Verify() error {
	var errs []error

	if c.Ledger == nil {
		errs = append(errs, errors.New("ledger contract is not registerd"))
	}

	return errors.Join(errs...)
}
