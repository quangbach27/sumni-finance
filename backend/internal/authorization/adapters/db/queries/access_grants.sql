-- name: CreateAccessGrant :exec
INSERT INTO authz.access_grants (
    uuid,
    org_id,
    user_id,
    resource,
    actions,
    scope,
    granted_by
)
VALUES (
    @uuid,
    @org_id,
    @user_id,
    @resource,
    @actions,
    sqlc.narg('scope'),
    @granted_by
);

-- name: GetAccessGrantForUpdate :one
SELECT *
FROM authz.access_grants
WHERE org_id = @org_id
  AND uuid = @uuid
FOR UPDATE;

-- name: UpdateAccessGrantActions :exec
UPDATE authz.access_grants
SET actions = @actions,
    updated_at = now()
WHERE org_id = @org_id
  AND uuid = @uuid;

-- name: DeleteAccessGrant :execrows
DELETE FROM authz.access_grants
WHERE org_id = @org_id
  AND uuid = @uuid;
