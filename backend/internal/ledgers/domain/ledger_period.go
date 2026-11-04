package domain

import (
	"time"

	common "github.com/quangbach27/golang-common"
)

type LedgerPeriodUUID struct {
	common.UUID
}

type LedgerStatus struct {
	common.Enum[LedgerStatusValue]
}

type LedgerStatusValue string

func (v LedgerStatusValue) Values() []string {
	return []string{"opened", "reopened", "closed", "reconciled"}
}

type LedgerPeriod struct {
	uuid       LedgerPeriodUUID

	openDate   time.Time
	closedDate time.Time

	status LedgerStatus
}

func NewInitialLedgerPeriod() (*LedgerPeriod, error) {
	return &LedgerPeriod{}, nil
}
