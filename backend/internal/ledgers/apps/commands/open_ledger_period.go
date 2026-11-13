package commands

import (
	"context"
	"time"

	"github.com/quangbach27/golang-common/log"

	"github.com/shopspring/decimal"

	"backend/internal/ledgers/domain"
)

type OpenLedgerPeriod struct {
	OrgID           string
	Name            string
	OpenDate        time.Time
	CloseDate       time.Time
	FundSourceUUIDs []domain.FundSourceUUID
}

// OpenLedgerPeriod opens a new period whose opening balance is the sum of the
// selected fund sources' balances. The repository refuses to open one while an
// unlocked (not reconciled) period exists.
func (h *Handlers) OpenLedgerPeriod(ctx context.Context, cmd OpenLedgerPeriod) (domain.LedgerPeriodUUID, error) {
	var periodUUID domain.LedgerPeriodUUID

	err := h.periodRepo.OpenLedgerPeriod(ctx, cmd.OrgID, cmd.FundSourceUUIDs, func(fundSources []*domain.FundSource) (*domain.LedgerPeriod, error) {
		openingBalance := decimal.Zero
		for _, fs := range fundSources {
			openingBalance = openingBalance.Add(fs.Balance())
		}

		period, err := domain.NewLedgerPeriod(cmd.Name, openingBalance, cmd.OpenDate, cmd.CloseDate)
		if err != nil {
			return nil, err
		}

		periodUUID = period.UUID()

		return period, nil
	})
	if err != nil {
		return domain.LedgerPeriodUUID{}, err
	}

	log.FromContext(ctx).With("periodUUID", periodUUID.String()).Info("ledger period opened")

	return periodUUID, nil
}
