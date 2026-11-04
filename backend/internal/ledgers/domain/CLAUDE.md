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
- **Balance operations**: `TopUp(amount)` and `Withdraw(amount)` require a positive amount; `Withdraw` fails with `insufficient-balance` if it would go below zero. Balance can never be negative (also enforced by DB `CHECK (balance >= 0)`). The repository's `UpdateBalance` (load-modify-save callback) is stubbed/commented out; not yet implemented.

### Use cases
- `CreateFundSource` command: builds details by type (bank requires the `Bank` input; unknown type -> `unsupported-type`), then the aggregate, then persists; returns the new UUID.
- `ListFundSources` query: returns all fund sources via the read model (no pagination/filtering/user scoping yet).

### Persistence
Single table `ledgers.fund_sources` (schema `ledgers`; each module owns its own Postgres schema). Details are flattened into columns: `owner_name` always set; `bank_*` and `account_number` nullable but enforced non-null when `type = 'bank'`. Balance is `numeric(20,2)`. Repository writes inside `commonDb.UpdateInReadCommittedTx`.

### HTTP API (`/api/v1/fund-sources`)
`GET` lists, `POST` creates (201 returns `fundSourceUuid`). Handlers translate request -> command, leaving missing bank fields as `""` so the domain factory produces the validation errors (do not duplicate validation in the HTTP layer). Errors are returned as `common.Error` values from `golang-common`, which the Echo server maps to HTTP responses; 400/401/500 response shapes are defined in the OpenAPI spec.
