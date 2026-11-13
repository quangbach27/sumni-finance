# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the authorization module (`internal/authorization`). The detailed business rules (policies, grants, the decision, slugs) are in `domain/CLAUDE.md`; this file covers how the module is laid out and how other modules use it. See `backend/CLAUDE.md` for repo-wide architecture.

## Purpose

The identity provider (Clerk) gives each request an `auth.Session`: user id (`Subject`), org id (`Extra["organization"]`) and one role. This module decides what that principal may do, and returns the verified user id and org id so other modules scope their data by org instead of trusting the request. The module name and Postgres schema are `authz` (`authorization` is a reserved word in Postgres).

## Layout

```
module.go                    Init: migrate -> grant repo -> grant read model -> policy catalog -> command handlers
                             RegisterHttp (access-grants API), RegisterContracts (sets contracts.Authorization)
domain/                      Rule, Policy, AccessGrant, repository interface (see domain/CLAUDE.md)
apps/
  policy_catalog.go          PolicyCatalog.Authorize: the one decision function
  default_policies.go        role -> policies baseline (configuration, not domain logic)
  commands/                  GrantAccess, UpdateAccessGrant, RevokeAccess
  models/                    Principal, GrantView, HasGrantQuery
adapters/db/                 access_grant_repo.go (writes), grant_rm.go (reads + HasGrant), migrations, sqlc queries
ports/http/                  access-grants endpoints; spec is ../../../api/openapi/authorization.yml
ports/module/                Authorization (implements the contract), PrincipalFromSession / PrincipalFromContext
ports/module/client/         the contract other modules depend on
```

There are no app-layer queries: grant reads go straight through the `adapters/db` read model.

## Decision flow

`PolicyCatalog.Authorize(ctx, principal, resource, action, scope)`:
1. Principal must have user id, org id and role, else 401 `invalid-principal`.
2. The role's policies allow it -> allow, no DB lookup.
3. Otherwise look up the user's own access grant (org + user + resource + scope, `action = ANY(actions)`) -> allow if found.
4. Otherwise 403 `permission-denied`.

Grants are per user and per org; they never carry over to another user or org.

## Role baseline (`apps/default_policies.go`)

| Role | Policy | Allows |
|---|---|---|
| `office_admin` | AdministratorAccess | every action on every resource (including `access_grant`) |
| `office_accountant`, `office_viewer` | ReadOnlyAccess | `read` on `fund_source`, `ledger_period`, `ledger_entry`, `ledger_category` |

Anything beyond the baseline is an access grant given by an admin. `access_grant` itself can never be granted (prevents privilege escalation), so managing grants is admin-only.

## Cross-module contract (`ports/module/client`)

```go
Authorize(ctx, AuthorizeRequest{Session, Resource, Action, Scope}) (AuthorizeResponse{UserID, OrgID}, error)
```

- Registered in `contracts.Contracts.Authorization`. `internal/svc.go` must initialize authorization before any module that calls it.
- `PrincipalFromSession` (`ports/module/module.go`) is the only place a session becomes a `Principal`: nil session -> 401 `session-required`; empty or unknown role -> 403 `unknown-role`; missing user or org -> 401. Other modules never build principals.
- Callers must use the returned `OrgID` / `UserID` and ignore any org id sent in the request. Errors are `common.Error` (401/403) and can be returned as is.
- `Scope` is optional (`resource/id`, e.g. `fund_source/123`); nil means the request is not scoped.
- Grant, update and revoke are not in the contract. They exist only in the HTTP API.
- Keep the contract at one method unless another module truly needs more.

## Extending

- New resource: add it to `internal/shared/resource.go`. Add it to `readOnlyAccess` in `default_policies.go` if non-admin roles may read it (admin picks it up automatically through `AllResources()`).
- New role: add it to `internal/shared/role.go` and map it in `defaultRolePolicies`.
- New action: add it to `internal/shared/action.go`.
- API change: edit `api/openapi/authorization.yml`, then `make gen`. DB change: new numbered migration + `queries/*.sql`, then `make gen`. Never hand-edit `dbmodels/` or `*.gen.go`.

## Tests

Unit tests for the domain (`policy_test.go`, `access_grant_test.go`), `integration`-tagged tests for `adapters/db`, and the component test `tests/ledgers/authorization_test.go` for end-to-end enforcement. No tests in `apps/` (see the `go-test-strategy` skill).
