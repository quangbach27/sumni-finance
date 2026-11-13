-- name: ListCategoriesByUUIDs :many
SELECT *
FROM ledgers.categories
WHERE org_id = @org_id
  AND uuid = ANY(@uuids::uuid[]);

-- Name and description are the only fields an update changes. A changed parent
-- touches no row (0 rows affected), so a category never moves.
-- name: UpsertCategory :execrows
INSERT INTO ledgers.categories (
    org_id,
    uuid,
    parent_uuid,
    name,
    description
)
VALUES (
    @org_id,
    @uuid,
    sqlc.narg('parent_uuid'),
    @name,
    sqlc.narg('description')
)
ON CONFLICT (uuid) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description
WHERE ledgers.categories.org_id = EXCLUDED.org_id
  AND ledgers.categories.parent_uuid IS NOT DISTINCT FROM EXCLUDED.parent_uuid;

-- name: ListCategories :many
SELECT *
FROM ledgers.categories
WHERE org_id = @org_id
ORDER BY lower(name), uuid;

-- name: ListExistingCategoryUUIDs :many
SELECT uuid
FROM ledgers.categories
WHERE org_id = @org_id
  AND uuid = ANY(@uuids::uuid[]);
