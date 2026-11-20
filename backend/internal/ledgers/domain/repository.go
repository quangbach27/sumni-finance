package domain

import "context"

type FundSourceRepository interface {
	CreateFundSource(ctx context.Context, orgID string, fundSource *FundSource) error
}

type LedgerPeriodRepository interface {
	// OpenLedgerPeriod loads the given fund sources, passes them to createFn,
	// then stores the new period and one period fund source per fund source.
	// It fails if an unlocked (not reconciled) period already exists.
	OpenLedgerPeriod(
		ctx context.Context,
		orgID string,
		fundSourceUUIDs []FundSourceUUID,
		createFn func(fundSources []*FundSource) (*LedgerPeriod, error),
	) error
	// CloseLedgerPeriod closes the period and sets the closing balance of every
	// fund source statement to the current balance of its fund source, all or
	// nothing.
	CloseLedgerPeriod(
		ctx context.Context,
		orgID string,
		ledgerPeriodUUID LedgerPeriodUUID,
	) error
	// ReconcileFundSourceStatements reconciles the given statements of a closed
	// period: each actual balance must match the statement's closing balance.
	// All statements are reconciled or none is; failures are returned together
	// with one detail per statement.
	ReconcileFundSourceStatements(
		ctx context.Context,
		orgID string,
		ledgerPeriodUUID LedgerPeriodUUID,
		reconciledBy string,
		balances []StatementActualBalance,
	) error
	ReopenLedgerPeriod(
		ctx context.Context,
		orgID string,
		ledgerPeriodUUID LedgerPeriodUUID,
		reason string,
	) error
	// ReconcileLedgerPeriod locks a closed period once every fund source
	// statement is reconciled. The period closing balance becomes the total of
	// the statements' closing balances.
	ReconcileLedgerPeriod(
		ctx context.Context,
		orgID string,
		ledgerPeriodUUID LedgerPeriodUUID,
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
		orgID string,
		ledgerPeriodUUID LedgerPeriodUUID,
		fundSourceUUIDs []FundSourceUUID,
		postFn func(period *LedgerPeriod, fundSources map[FundSourceUUID]*FundSource) ([]*LedgerEntry, error),
	) error
	// VoidJournalEntry voids one entry in a serializable transaction (no row
	// locks; a concurrent change fails the transaction and it is retried). It
	// loads the entry, its period and its fund source, fails with 409
	// `period-not-open` unless the period is open, voids the entry, applies the
	// reversal to the fund source (recording the snapshot), then stores the
	// reversal, the voided entry and the fund source balance, all or nothing.
	VoidJournalEntry(
		ctx context.Context,
		orgID string,
		ledgerEntryUUID LedgerEntryUUID,
		reason, voidedBy string,
	) error
}
