package domain

import "context"

type FundSourceRepository interface {
	CreateFundSource(ctx context.Context, fundSource *FundSource) error
}

type LedgerPeriodRepository interface {
	// OpenLedgerPeriod loads the given fund sources, passes them to createFn,
	// then stores the new period and one period fund source per fund source.
	// It fails if an unlocked (not reconciled) period already exists.
	OpenLedgerPeriod(
		ctx context.Context,
		fundSourceUUIDs []FundSourceUUID,
		createFn func(fundSources []*FundSource) (*LedgerPeriod, error),
	) error
	CloseLedgerPeriod(
		ctx context.Context,
		ledgerPeriodUUID LedgerPeriodUUID,
	) error
	ReopenLedgerPeriod(
		ctx context.Context,
		ledgerPeriodUUID LedgerPeriodUUID,
		updateFn func(period *LedgerPeriod) error,
	) error
	ReconcileLedgerPeriod(
		ctx context.Context,
		ledgerPeriodUUID LedgerPeriodUUID,
		updateFn func(period *LedgerPeriod) error,
	) error
}

type LedgerEntryRepository interface {
	PostJournalEntries(ctx context.Context, entries []*LedgerEntry) error
	VoidEntry(
		ctx context.Context,
		ledgerEntryUUID LedgerEntryUUID,
		voidFn func(*LedgerEntry) (*LedgerEntry, error), // Void function receive the voided ledger entry, then update and return reversal ledger entry
	) error
}
