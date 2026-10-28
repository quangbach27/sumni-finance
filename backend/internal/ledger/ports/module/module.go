package module

import (
	"context"

	"backend/internal/ledger/ports/module/client"
)

type Ledger struct{}

var _ client.Ledger = (*Ledger)(nil)

func NewLedger() (*Ledger, error) {
	return &Ledger{}, nil
}

func (l *Ledger) Ping(_ context.Context) error {
	return nil
}
