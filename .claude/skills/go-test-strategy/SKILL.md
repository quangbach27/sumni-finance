---
name: go-test-strategy
description: Use when writing, changing or reviewing Go tests in backend/ (or deciding whether code needs a test). Fixes which layer gets which kind of test (unit, integration, component), the build tags, and what not to test (no tests for the command/app layer).
---

# Go test strategy (backend/)

## Which test for which layer

| Layer | Test type | Build tag | Where |
|---|---|---|---|
| `domain/`, `apps/models/`, `internal/shared/` | unit | none | beside the code, `package x_test` |
| `adapters/db` (repositories, read models) | integration | `integration` | beside the adapter |
| `ports/http` (through the real server) | component | `component` | `backend/tests/<module>/` |
| `apps/commands`, `apps/queries` | **no tests** | | covered by component tests |
| `ports/module` | no tests with fakes | | covered by component tests |

Choosing: rule about data -> unit. SQL or constraint -> integration. Request, response, permission or flow -> component.

## Unit tests (business logic)

- Only pure rules: validation and its error slugs, state transitions, policy matrices, mappings.
- No database, no network, no fake or mock repositories.
- Table-driven with `t.Run` + `t.Parallel()`. `require` for must-stop checks, `assert` for independent ones.
- Assert errors by slug: `errors.AsType[common.Error](err)` then `.ErrorSlug`.
- Run: `make test-unit`.

## Integration tests (db layer)

- Real Postgres. Test repository and read-model SQL: writes, reads, constraint behaviour (unique violation -> 409, missing row -> 404), org/user isolation.
- Each package has `setup_test.go` with `//go:build integration` that runs `MigrateDatabaseUp` for its module. Copy `internal/ledgers/adapters/db/setup_test.go`.
- Isolate data per test (fresh org id or uuid) instead of truncating tables.
- Run: `make test-integration`.
- Examples: `ledgers/adapters/db/fund_source_repo_test.go`, `authorization/adapters/db/access_grant_repo_test.go`.

## Component tests (http layer)

- Test HTTP behaviour end to end: status codes, error slugs, permissions, org isolation, main flows.
- Use the generated client in `ports/http/clients` through `tests/utils` (`StartServer`, `NewTestClients`, `NewSession` / `NewOrgSession`, `AuthEditorFn`). A new module's client is added to `tests/utils/clients.go`.
- `//go:build component`; `TestMain` calls `utils.StartServer`.
- Each test creates its own data (own org and users) so tests do not collide.
- Run: `make test-component` (uses `-p 1`).
- Examples: `tests/ledgers/*`, `tests/authorization/access_grants_test.go`.

## Do not test

- Command or query handlers with fake repos or mocks. If a command holds logic worth testing, move it into the domain or `apps/models` and unit test it there.
- Generated code (`*.gen.go`, `dbmodels/`), trivial getters, `module.go` wiring (the component server boot covers it).

## Before finishing

Run the targets that match your change: `make test-unit`, plus `make test-integration` when SQL changed and `make test-component` when HTTP changed (they need Postgres).
