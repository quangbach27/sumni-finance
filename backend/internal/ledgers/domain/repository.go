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
	// PostJournalEntries posts many entries of one period at once. It loads the
	// period and the fund sources in a serializable transaction and passes them
	// to postFn, which applies the entries to the fund sources (recording each
	// fund source snapshot) and returns them. The repository then stores the
	// entries and the updated fund source balances, all or nothing. postFn can
	// run more than once (transaction retry), so it must build its entries on
	// every call.
	PostJournalEntries(
		ctx context.Context,
		ledgerPeriodUUID LedgerPeriodUUID,
		fundSourceUUIDs []FundSourceUUID,
		postFn func(period *LedgerPeriod, fundSources map[FundSourceUUID]*FundSource) ([]*LedgerEntry, error),
	) error
	// VoidJournalEntry voids one entry of a period. voidFn receives the period,
	// the entry to void and its fund source; it voids the entry, applies the
	// reversal to the fund source (recording the snapshot) and returns the
	// reversal entry. The repository then stores the voided entry, the reversal
	// and the updated fund source balance, all or nothing.
	VoidJournalEntry(
		ctx context.Context,
		ledgerPeriodUUID LedgerPeriodUUID,
		ledgerEntryUUID LedgerEntryUUID,
		voidFn func(period *LedgerPeriod, entry *LedgerEntry, fundSource *FundSource) (*LedgerEntry, error),
	) error
}
