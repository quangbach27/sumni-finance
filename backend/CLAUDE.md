# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this directory (`backend/`). See the root `CLAUDE.md` for commands and repo-wide context.

## File architecture

```
cmd/main.go                          entrypoint (config, pgx pool, token verifier -> internal.New)
internal/
  svc.go                             composition root: builds modules, contracts, Echo server
  configs/
    configs.go                       env config
    modules/modules.go               `Module` interface + module Name constants + EchoRouter
    modules/contracts/contracts.go   `Contracts` struct: one embedded client interface per module; Verify()
  shared/                            cross-module value types (Currency, Role, Resource, Action, ResourceScope)
  <module>/                          one folder per bounded context (currently: ledgers, authorization)
    module.go                        implements modules.Module; wires adapters -> apps -> ports in Init()
    domain/                          aggregates, factories, repository + external-service interfaces
    apps/commands/                   write use cases; handlers.go holds deps + constructor
    apps/queries/                    read use cases + read-model interface + read DTOs (types.go)
    adapters/db/                     pgx repository, read model, sqlc config/queries/migrations
      migrations/NNNNN_name.{up,down}.sql
      queries/*.sql                  sqlc input
      dbmodels/                      sqlc output (generated, do not edit)
      sqlc_gen.go                    //go:generate for sqlc
    adapters/bankverifier/           stub of domain.BankAccountVerifier
    ports/http/                      handlers.go (StrictServerInterface impl), oapi.yml + generated server code
    ports/http/clients/              generated HTTP client (used by component tests)
    ports/module/                    cross-module contract implementation; ports/module/client = its interface
tests/                               component tests (build tag `component`): utils/ boots server + fake auth
```

The OpenAPI spec lives outside this dir at `../api/openapi/<module>.yml`; `oapi.yml` files are oapi-codegen configs pointing at it. `x-go-type` in the spec maps schema types straight to domain types (`domain.FundSourceType`, `shared.Currency`, `decimal.Decimal`).

### Layering rules
- Dependency direction: `ports` -> `apps` -> `domain` <- `adapters`. `domain` imports nothing from the other layers; adapters implement interfaces declared in `domain` (repositories, `BankAccountVerifier`) or `apps/queries` (`FundSourceReadModel`).
- Writes go: HTTP handler -> command handler -> factory/aggregate -> repository. Reads go: HTTP handler -> query handler -> read model (SQL straight to DTOs, bypassing aggregates).
- Constructors (`NewX`) validate non-nil deps and return `(T, error)`, collecting errors with `errors.Join`; `Module.Init` propagates them.
- Other modules may only depend on a module through `ports/module/client` interfaces registered in `contracts.Contracts`, never its internals. Adding a module = add a `modules.Name`, a field in `Contracts` (+ `Verify`), and append it in `internal/svc.go`.
- Interface conformance is asserted with `var _ Iface = (*Impl)(nil)`.
- Tests: unit tests beside the code (domain), `integration`-tagged tests for `adapters/db`, `component`-tagged tests in `tests/`. No tests for `apps/` (no fake repos); see the `go-test-strategy` skill.

## Business logic

Domain rules for each module are documented in that module's `domain/CLAUDE.md` (e.g. `internal/ledgers/domain/CLAUDE.md`: fund sources, validation, persistence, HTTP API; `internal/authorization/domain/CLAUDE.md`: role policies, per-user access grants, the `Authorize` contract).

Module overview for authorization: `internal/authorization/CLAUDE.md`.

The `authorization` module (module name and DB schema `authz`) exports `ports/module/client.Authorization` through `contracts.Contracts`. The contract has one method, `Authorize` (requests carry the caller's `*auth.Session`; the module parses it into a principal and returns the verified `client.AuthorizeResponse{UserID, OrgID}`); grants are managed only through the HTTP API. The decision lives in `apps/policy_catalog.go` (`Authorize`, built by `NewDefaultPolicyCatalog` with the default role policies from `apps/default_policies.go`); it has no app-layer queries, grant reads go through the `adapters/db` read model (`grant_rm.go`).

Every ledgers command and query authorizes first: its struct carries `Session *auth.Session` (set by the HTTP port), the method calls `h.modules.Authorize(ctx, client.AuthorizeRequest{Session, Resource, Action})` on its `ModulesContract` interface (declared in `apps/commands` and `apps/queries`, satisfied by `*contracts.Contracts`) , and uses the returned `AuthorizeResponse.OrgID` (and `UserID`) instead of any org id from the request. `svc.go` initializes modules in order and registers each contract right after its `Init`, so authorization must be listed before ledgers. Any future non-HTTP caller (webhook, queue consumer) must build an `auth.Session` from a verified Clerk machine token (service role + org from the message) and go through the same commands; there is no bypass.

## Working on the backend
- Changing the API: edit `../api/openapi/ledgers.yml`, then `make gen`; implement the new method on `ports/http.Handlers` (the compiler flags the missing `StrictServerInterface` method).
- Changing the DB: add a new numbered migration pair, edit `queries/*.sql`, then `make gen`. Never edit `dbmodels/` or `*.gen.go`.
- Domain errors: use `common.NewInvalidInputError(slug, msg)` with `.WithDetails(...)` for multi-field validation, following the existing slug style (`kebab-case`).
