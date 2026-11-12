package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"backend/internal/authorization/apps"
	"backend/internal/authorization/apps/models"
)

// GrantReadModel reads access grants straight from Postgres (no aggregates).
type GrantReadModel struct {
	db *pgxpool.Pool
}

var _ apps.GrantReadModel = (*GrantReadModel)(nil)

func NewGrantReadModel(db *pgxpool.Pool) (*GrantReadModel, error) {
	if db == nil {
		return nil, errors.New("db can't be nil")
	}

	return &GrantReadModel{db: db}, nil
}

// HasGrant reports whether the user holds a grant that covers the request. The
// lookup is always keyed by org and user, so grants never leak between users.
// An unscoped grant satisfies any request; a scoped grant only its own scope.
func (g *GrantReadModel) HasGrant(ctx context.Context, q models.HasGrantQuery) (bool, error) {
	var scope *string
	if q.Scope != nil {
		str := q.Scope.String()
		scope = &str
	}

	const query = `
SELECT EXISTS (
    SELECT 1
    FROM authz.access_grants
    WHERE org_id = $1
      AND user_id = $2
      AND resource = $3
      AND $4::text = ANY (actions)
      AND (scope IS NULL OR scope = $5::text)
)`

	var ok bool
	err := g.db.QueryRow(ctx, query,
		q.OrgID, q.UserID, q.Resource.String(), q.Action.String(), scope,
	).Scan(&ok)
	if err != nil {
		return false, fmt.Errorf("check access grant: %w", err)
	}

	return ok, nil
}

func (g *GrantReadModel) ListGrants(ctx context.Context, q models.ListGrantsQuery) ([]models.GrantView, error) {
	const query = `
SELECT uuid, user_id, resource, actions, scope, granted_by, created_at, updated_at
FROM authz.access_grants
WHERE org_id = $1
  AND ($2::text = '' OR user_id = $2)
  AND ($3::text = '' OR resource = $3)
ORDER BY created_at, uuid`

	rows, err := g.db.Query(ctx, query, q.OrgID, q.UserID, q.Resource)
	if err != nil {
		return nil, fmt.Errorf("list access grants: %w", err)
	}

	views, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (models.GrantView, error) {
		var v models.GrantView
		err := row.Scan(
			&v.UUID, &v.UserID, &v.Resource, &v.Actions, &v.Scope,
			&v.GrantedBy, &v.CreatedAt, &v.UpdatedAt,
		)

		return v, err
	})
	if err != nil {
		return nil, fmt.Errorf("list access grants: %w", err)
	}

	if views == nil {
		views = []models.GrantView{}
	}

	return views, nil
}
