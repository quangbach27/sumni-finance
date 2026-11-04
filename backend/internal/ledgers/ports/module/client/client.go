package client

import "context"

type Ledger interface {
	Ping(ctx context.Context) error
}
