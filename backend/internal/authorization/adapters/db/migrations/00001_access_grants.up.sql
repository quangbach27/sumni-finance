BEGIN;

CREATE SCHEMA IF NOT EXISTS authz;

-- Extra permissions given to one user on top of their role. scope is NULL when the
-- grant applies to every instance of `resource`, otherwise "resource/id" (e.g. fund_source/123).
CREATE TABLE authz.access_grants (
    uuid           uuid PRIMARY KEY,
    org_id         text NOT NULL,
    user_id        text NOT NULL,
    resource       text NOT NULL,
    actions        text[] NOT NULL CHECK (cardinality(actions) > 0),
    scope          text,
    granted_by     text NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX access_grants_user_resource_scope_uq
    ON authz.access_grants (org_id, user_id, resource, coalesce(scope, ''));

CREATE INDEX access_grants_org_user_idx ON authz.access_grants (org_id, user_id);

COMMIT;
