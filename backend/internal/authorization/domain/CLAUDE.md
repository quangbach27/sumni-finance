# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this package (`internal/authorization/domain`).

## Business logic (authorization module)

The identity provider gives us user id, org id and a single role (`auth.Session`: `Subject`, `Extra["organization"]`, `Role`). This module decides what that principal may do. The module name and Postgres schema are `authz` (`authorization` is a reserved word in Postgres).

`Role`, `Resource`, `Action` and `ResourceScope` live in `internal/shared` so other modules can name them without importing this package. New modules add their resources there.

### Policies: `policy.go`
- The domain only has the generic building blocks: `Rule{resource, actions}` and `Policy{name, rules}` with `Policy.Allows(resource, action)`, validated in `NewRule` / `NewPolicy`.
- The default role baseline is configuration, not domain logic, so it lives in the app layer (`apps/default_policies.go`, used by `apps.NewDefaultPolicyCatalog`): `office-admin` = `AdministratorAccess` (all resources, all actions); `office-accountant` and `office-viewer` = `ReadOnlyAccess` (read on `fund_source`, `ledger_period`, `ledger_entry`).

### Access grants: `access_grant.go`
Extra permissions an admin gives to ONE user on top of the role.
- Fields: org, user, resource, actions (a set), optional scope (`ResourceScope`, written `resource/id` e.g. `fund_source/123`, text-marshalled and stored in one `scope` column), granted_by.
- Unscoped grant = applies to every instance of the resource (e.g. accountant may create fund sources). Scoped grant = only within the scope (e.g. ledger entries of fund source `123`). An unscoped grant also covers scoped requests; a scoped grant never covers an unscoped request.
- One grant per (org, user, resource, scope); a second one is a 409 `access-grant-already-exists`. Change actions with `ChangeActions`.
- Validation slugs (400): `org-id-required`, `user-id-required`, `granted-by-required`, `resource-required`, `resource-not-grantable` (`access_grant` can never be granted, which prevents privilege escalation), `actions-required`, `action-required`, `invalid-grant-scope`.

### Decision: `apps.PolicyCatalog.Authorize(ctx, principal, resource, action, scope)`
The catalog's only exported method (besides its constructor); `ports/module` and the commands both call it.
1. Role policies allow -> allow, no DB lookup.
2. Otherwise a grant lookup (`GrantReadModel.HasGrant`) keyed by the caller's org + user id + resource + scope, with `action = ANY(actions)` -> allow if found.
3. Otherwise 403 `permission-denied`.
Grants are per user: user_1's grant on fund source 123 never applies to user_2 or to another org.

### Use cases (`apps/commands`, actor is `models.Principal`)
- `GrantAccess` (needs `access_grant`/create), `UpdateAccessGrant` (update), `RevokeAccess` (delete). Role check failure is 403 `permission-denied`. Updates and revokes are limited to the actor's org; a grant of another org is 404 `access-grant-not-found`.
- Grant lookups and listing have no query handlers: `adapters/db/grant_rm.go` (`GrantReadModel`) queries Postgres directly. It implements `apps.GrantReadModel` for the catalog and serves the list endpoint through `models.GrantView`.

### HTTP (`api/openapi/authorization.yml`)
`POST/GET /api/v1/access-grants`, `PUT/DELETE /api/v1/access-grants/{access_grant_uuid}`. Listing needs `access_grant`/read (admin only). Identity comes from the session only (`module.PrincipalFromContext` in `ports/module/module.go`): missing user or org is 401, empty or unknown role is 403. The module contract (`ports/module/client`) has a single method, `Authorize`: it takes the caller's `*auth.Session` and parses it into a `models.Principal` itself (`module.PrincipalFromSession`), so other modules never build principals. Grant, update and revoke are not in the contract; they are only available through the HTTP API.

### Persistence (`adapters/db`)
`authz.access_grants`, one row per grant, `actions text[]`, `scope` text NULL (`resource/id`), unique index on (org, user, resource, scope); sqlc maps `resource`, `actions` and `scope` straight to `shared.Resource`, `[]shared.Action` and `*shared.ResourceScope`.
