package contracts

import (
	"errors"

	authorizationClient "backend/internal/authorization/ports/module/client"
	ledgerClient "backend/internal/ledgers/ports/module/client"
)

type Contracts struct {
	ledgerClient.Ledger
	authorizationClient.Authorization
}

// Verify checks that every module has registered its contract.
func (c *Contracts) Verify() error {
	var errs []error

	if c.Ledger == nil {
		errs = append(errs, errors.New("ledger contract is not registerd"))
	}

	if c.Authorization == nil {
		errs = append(errs, errors.New("authorization contract is not registered"))
	}

	return errors.Join(errs...)
}
