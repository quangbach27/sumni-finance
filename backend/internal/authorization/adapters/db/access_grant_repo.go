package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	common "github.com/quangbach27/golang-common"
	commonDb "github.com/quangbach27/golang-common/db"

	"backend/internal/authorization/adapters/db/dbmodels"
	"backend/internal/authorization/domain"
)

const pgUniqueViolation = "23505"

type AccessGrantRepository struct {
	db *pgxpool.Pool
}

var _ domain.AccessGrantRepository = (*AccessGrantRepository)(nil)

func NewAccessGrantRepository(db *pgxpool.Pool) (*AccessGrantRepository, error) {
	if db == nil {
		return nil, errors.New("db can't be nil")
	}

	return &AccessGrantRepository{db: db}, nil
}

func (r *AccessGrantRepository) CreateAccessGrant(ctx context.Context, grant *domain.AccessGrant) error {
	params := dbmodels.CreateAccessGrantParams{
		Uuid:      grant.UUID(),
		OrgID:     grant.OrgID(),
		UserID:    grant.UserID(),
		Resource:  grant.Resource(),
		Actions:   grant.Actions(),
		Scope:     grant.Scope(),
		GrantedBy: grant.GrantedBy(),
	}

	err := commonDb.UpdateInReadCommittedTx(ctx, r.db, func(ctx context.Context, tx pgx.Tx) error {
		return dbmodels.New(tx).CreateAccessGrant(ctx, params)
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgUniqueViolation {
			return common.NewConflictError(
				"access-grant-already-exists",
				"the user already has a grant for this resource and scope",
			)
		}

		return fmt.Errorf("create access grant: %w", err)
	}

	return nil
}

func (r *AccessGrantRepository) UpdateAccessGrant(
	ctx context.Context,
	orgID string,
	uuid domain.AccessGrantUUID,
	updateFn func(ctx context.Context, grant *domain.AccessGrant) error,
) error {
	err := commonDb.UpdateInTx(ctx, r.db, func(ctx context.Context, tx pgx.Tx) error {
		q := dbmodels.New(tx)

		row, err := q.GetAccessGrantForUpdate(ctx, dbmodels.GetAccessGrantForUpdateParams{
			OrgID: orgID,
			Uuid:  uuid,
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return errAccessGrantNotFound()
			}

			return err
		}

		grant := toDomainAccessGrant(row)

		if err := updateFn(ctx, grant); err != nil {
			return err
		}

		return q.UpdateAccessGrantActions(ctx, dbmodels.UpdateAccessGrantActionsParams{
			OrgID:   orgID,
			Uuid:    uuid,
			Actions: grant.Actions(),
		})
	})
	if err != nil {
		if _, ok := errors.AsType[common.Error](err); ok {
			return err
		}

		return fmt.Errorf("update access grant: %w", err)
	}

	return nil
}

func (r *AccessGrantRepository) DeleteAccessGrant(
	ctx context.Context,
	orgID string,
	uuid domain.AccessGrantUUID,
) error {
	err := commonDb.UpdateInReadCommittedTx(ctx, r.db, func(ctx context.Context, tx pgx.Tx) error {
		affected, err := dbmodels.New(tx).DeleteAccessGrant(ctx, dbmodels.DeleteAccessGrantParams{
			OrgID: orgID,
			Uuid:  uuid,
		})
		if err != nil {
			return err
		}

		if affected == 0 {
			return errAccessGrantNotFound()
		}

		return nil
	})
	if err != nil {
		if _, ok := errors.AsType[common.Error](err); ok {
			return err
		}

		return fmt.Errorf("delete access grant: %w", err)
	}

	return nil
}

func errAccessGrantNotFound() error {
	return common.NewNotFoundError("access-grant-not-found", "access grant not found")
}

func toDomainAccessGrant(row dbmodels.AuthzAccessGrant) *domain.AccessGrant {
	return domain.UnmarshalAccessGrantFromDB(
		row.Uuid, row.OrgID, row.UserID, row.Resource, row.Actions, row.Scope, row.GrantedBy,
	)
}
