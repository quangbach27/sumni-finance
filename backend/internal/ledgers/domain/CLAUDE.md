# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this package (`internal/ledgers/domain`).

## Business logic (ledgers module)

### FundSource aggregate (`domain/fund-source*.go`)
A fund source is a place money is held: a **bank** account or **cash**. Fields: uuid (UUIDv7, generated in factory), name, balance (`decimal.Decimal`), currency, and type-specific `details`.

- **Types** are the enum `bank | cash` (`FundSourceType`). Details are a sealed interface `FundSourceDetails` (unexported `sealed()`), implemented only by `*BankDetails` (bankCode, bankBin int32, bankShortName, ownerName, accountNumber) and `*CashDetails` (ownerName). Type is derived from details, not stored separately on the aggregate. Adding a type means a new details struct, enum value, DB check constraint, repo switch case, and read-model mapping.
- **Currency**: only `VND` is supported (`shared.Currency`).
- **Creation always goes through `FundSourceFactory`** (aggregate fields are private). Validation:
  - name: trimmed, required. start balance: must be >= 0. currency and details: required.
  - Bank details: bank code, short name, owner name, account number are trimmed and required; bin is an int32 that must be > 0; then `BankAccountVerifier.Verify(bankCode, accountNumber)` is called. A `common.Error` from the verifier is returned as-is; any other error becomes `bank-account-invalid`. Currently the verifier is a stub (`adapters/bankverifier`) holding a list of valid accounts (`SetValidAccounts`/`AddValidAccounts`): non-empty list → unlisted accounts fail with `bank-account-invalid`; empty list → bypass with a warning log; the real one is a TODO in `module.go`.
  - Cash details: owner name required.
  - Multiple validation failures are aggregated into `common.ErrorDetails` (slugs like `name-required`, `start-balance-negative`) on an `InvalidInputError`.
- **Balance operations**: `TopUp(amount)` and `Withdraw(amount)` require a positive amount; `Withdraw` fails with `insufficient-balance` if it would go below zero. Both return a `FundSourceSnapshot` (fund source UUID, `Balance` before, `BalanceAfter`); on error the snapshot is zero-valued. Balance can never be negative (also enforced by DB `CHECK (balance >= 0)`). The repository's `UpdateBalance` (load-modify-save callback) is stubbed/commented out; not yet implemented.

### LedgerEntry aggregate (`domain/ledger_entry.go`)
A ledger entry is one immutable money movement against a fund source. Fields are private; create with `NewLedgerEntry`. Fields: uuid (UUIDv7), `ledgerPeriodUUID` (required, `ledger-period-required`; `Void` copies it onto the reversal), `fundSourceUUID`, amount, direction (`shared.Direction`: inflow | outflow), description, `occurredAt` (when the transaction happened), optional `categoryUUID`, status, kind, and link/void fields.

- **Status** (`EntryStatus`): `posted | voided`. **Kind** (`EntryKind`): `normal | reversal`.

  | Entry | status | kind | Links |
  |---|---|---|---|
  | Normal post (just created) | posted | normal | none |
  | Voided original | voided | normal | `reversedByEntryID` → reversal, plus `voidedReason`, `voidedBy`, `voidedAt` |
  | Reversal (created by the void) | posted | reversal | `reversesEntryID` → original |

- **Immutability**: entries are never edited. To fix a mistake, the user voids the entry via `Void(reason, voidedBy)`, which marks the original `voided` and returns a new reversal entry (same fund source, amount and category; opposite direction; `occurredAt` = void time; description "Reversal of <uuid>"). Applying the entries to the fund source balance and persisting both is the command handler's job, not the aggregate's.
- **`NewLedgerEntry` validation** (aggregated into `invalid-ledger-entry` details): `fund-source-required`, `amount-must-be-positive`, `direction-required`, `description-required` (trimmed), `occurred-at-required`.
- **`Void` errors**: `ledger-entry-already-voided`, `reversal-entry-cannot-be-voided`, and `invalid-void` details `void-reason-required` / `voided-by-required`. On error the entry is left unchanged.
- **Status checks**: `IsVoided()` (status is voided), `IsReversed()` (a reversal has been linked), `IsReversal()` (kind is reversal).
- **Category**: the entry stores one optional `categoryUUID`. A sub-category is a category in the same tree (the relationship is two-way), so the entry needs no separate sub-category reference. Existence and tree rules belong to the Category aggregate / command handler (not modelled yet).
- **Fund source snapshot**: each entry stores `fsBalanceBefore` / `fsBalanceAfter`, the fund source balance around it. `RecordFundSourceSnapshot(FundSourceSnapshot)` sets them once (errors `fund-source-snapshot-already-recorded`, `snapshot-fund-source-mismatch`); the command handler passes the snapshot returned by `TopUp`/`Withdraw`. This per-entry trail is why `FundSourceStatement` is not reused for it: a statement is one row per period and fund source.
- `voidedBy` is a plain string user ID for now (no user type in the domain). Posting is implemented (see below); void is not (`LedgerPeriodRepo.VoidJournalEntry` is a stub).

### LedgerPeriod aggregate (`domain/ledger_period.go`)
A ledger period is a book with an open date and a close date for the whole ledger. Fields: uuid, name, `openingBalance` (total, summed by the service from the period's fund sources), `closingBalance` (nil until reconciled), `openDate`, `closeDate` (both set at creation), status, `reopenReason`, `reopenedAt`, `reconciledAt`. Entries and `FundSourceStatement` reference it by `LedgerPeriodUUID`.

- **Status** (`LedgerStatus`): `opened | closed | reconciled`. There is no `reopened` status; reopening goes back to `opened` and records `reopenReason`.

  | From | Method | To | Errors |
  |---|---|---|---|
  | opened | `Close()` | closed | `period-not-open` |
  | closed | `Reopen(reason)` | opened | `period-not-closed`, `reopen-reason-required` |
  | closed | `Reconcile(closingBalance)` | reconciled (locked), fills `closingBalance` | `period-not-closed`, `closing-balance-negative` |
  | reconciled | anything | - | `period-locked` |

- `NewLedgerPeriod(name, openingBalance, openDate, closeDate)` validation (aggregated into `invalid-ledger-period`): `name-required`, `opening-balance-negative`, `open-date-required`, `close-date-required`, `close-date-before-open-date`.
- `CanPostEntries()` is true only while `opened` (so also after a reopen, which is how the user posts adjusting entries). Reconciled is final: nothing can change.
- The aggregate does not check balances. The service must reconcile every `FundSourceStatement` first and call `period.Reconcile(closingBalance)` only when all match, passing the total of their closing balances (the aggregate does not verify the sum).

### FundSourceStatement aggregate (`domain/fund_source_statement.go`)
One fund source's balances within a period (the rows of the reconcile screen). Fields: uuid, `ledgerPeriodUUID`, `fundSourceUUID`, `openingBalance`, `closingBalance` (system balance, set by `Close` when the period is closed), and once reconciled `actualBalance`, `reconciledBy`, `reconciledAt`.

- `NewFundSourceStatement` validation (`invalid-fund-source-statement`): `ledger-period-required`, `fund-source-required`, `opening-balance-negative`. The service supplies the opening balance (previous period's closing balance, or the fund source balance for the first period).
- `Close(closingBalance)`: negative or already reconciled fails; stores the closing balance.
- `Reconcile(actualBalance, reconciledBy)`: already reconciled (`fund-source-statement-already-reconciled`), not closed (`fund-source-statement-not-closed`), empty user (`reconciled-by-required`), negative (`actual-balance-negative`) and a difference from the closing balance (`balance-mismatch`) all fail and leave the entity unchanged; otherwise stores `actualBalance`, `reconciledBy` and `reconciledAt`.
- Movement (closing - opening), difference and totals are computed in the service/read model, not stored.
- Close, reconcile and reopen are implemented (see use cases below). Void is not (its repo method is a stub).

### Use cases
- `CloseLedgerPeriod` command (`POST /api/v1/ledger-periods/{ledger_period_uuid}/close`, 204): all logic lives in `LedgerPeriodRepo.CloseLedgerPeriod` (no callback). In a serializable tx it loads the period (404 `ledger-period-not-found`), calls `period.Close()` (a non-opened period fails with 400 `period-not-open`), sets each statement's closing balance to its fund source's current balance, and stores the statuses and balances all or nothing.
- `ReopenLedgerPeriod` command (`POST /api/v1/ledger-periods/{ledger_period_uuid}/reopen`, body `{reason}`, 204): all logic lives in `LedgerPeriodRepo.ReopenLedgerPeriod`. In a serializable tx it loads the period (404), calls `period.Reopen(reason)` (400 `period-not-closed`, `period-locked`, `reopen-reason-required`), rejects with 409 `fund-source-statement-reconciled` if any statement is reconciled, clears every statement's closing balance and stores the status, reason and time.
- `ReconcileFundSourceStatements` command (`POST /api/v1/ledger-periods/{ledger_period_uuid}/statements/reconcile`, body `{statements: [{statement_uuid, actual_balance}]}`, 204): all or nothing. `LedgerPeriodRepo.ReconcileFundSourceStatements(ctx, periodUUID, reconciledBy, balances)` has no callback; it validates the UUIDs (`statements-required`, `duplicate-statement`), loads the period (404 `ledger-period-not-found`) and requires it closed (409 `period-not-closed`), loads the statements (404 `fund-source-statement-not-found`), then calls `Reconcile(actual, reconciledBy)` per statement (`reconciledBy` = session subject). Failures are collected into `invalid-statement-reconciliation` with `EntityID` = statement UUID and the statement's slug (e.g. `balance-mismatch`); nothing is stored then. The period itself is not locked by this; see `ReconcileLedgerPeriod`.
- `ReconcileLedgerPeriod` command (`POST /api/v1/ledger-periods/{ledger_period_uuid}/reconcile`, 204): `LedgerPeriodRepo.ReconcileLedgerPeriod(ctx, periodUUID)` has no callback; it loads the period (404 `ledger-period-not-found`), requires it closed (409 `period-not-closed`) and every statement reconciled (409 `statements-not-reconciled`, one detail per unreconciled statement, `EntityID` = statement UUID), then calls `period.Reconcile(total of statement closing balances)` and stores status, `closing_balance` and `reconciled_at`. A reconciled period is locked, so a new period can be opened.
- Updates use one COALESCE query per table (`UpdateLedgerPeriod`, `UpdateFundSourceStatement`): a nil argument keeps the column, so a column can't be reset to NULL through them (`status` is always written).
- `ListFundSourceStatements` query (`GET /api/v1/ledger-periods/{ledger_period_uuid}/statements`): the statements of a period (404 `ledger-period-not-found`), so clients can get statement UUIDs and closing balances.
- `PostLedgerEntries` command (`POST /api/v1/ledger-periods/{ledger_period_uuid}/entries`, body `{entries: [...]}`, 201 `ledger_entry_uuids` in request order): posts many entries of one period all or nothing. Entries are validated first (`entries-required`; `invalid-ledger-entries` with each detail's `EntityID` = entry index). `LedgerPeriodRepo.PostJournalEntries(ctx, periodUUID, fundSourceUUIDs, postFn)` runs in a serializable tx (with `commonDb` retry, so `postFn` rebuilds its entries each call): loads the period and its fund sources (404 `ledger-period-not-found`, 400 `fund-source-not-in-period`), `postFn` checks `CanPostEntries()` (409 `period-not-open`), tops up / withdraws per direction and records snapshots (`insufficient-balance` fails the batch), then entries are inserted with sqlc `:copyfrom` and balances updated with `:batchexec`. Table `ledgers.ledger_entries` (migration 00004).
- `CreateFundSource` command: builds details by type (bank requires the `Bank` input; unknown type -> `unsupported-type`), then the aggregate, then persists; returns the new UUID.
- `ListFundSources` query: returns all fund sources via the read model (no pagination/filtering/user scoping yet).

### Persistence
Single table `ledgers.fund_sources` (schema `ledgers`; each module owns its own Postgres schema). Details are flattened into columns: `owner_name` always set; `bank_*` and `account_number` nullable but enforced non-null when `type = 'bank'`. Balance is `numeric(20,2)`. Repository writes inside `commonDb.UpdateInReadCommittedTx`.

### HTTP API (`/api/v1/fund-sources`)
`GET` lists, `POST` creates (201 returns `fundSourceUuid`). Handlers translate request -> command, leaving missing bank fields as `""` so the domain factory produces the validation errors (do not duplicate validation in the HTTP layer). Errors are returned as `common.Error` values from `golang-common`, which the Echo server maps to HTTP responses; 400/401/500 response shapes are defined in the OpenAPI spec.
