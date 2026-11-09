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

	"backend/internal/ledgers/adapters/db/dbmodels"
	"backend/internal/ledgers/apps/commands"
	"backend/internal/ledgers/apps/models"
)

const pgUniqueViolation = "23505"

type CategoryRepo struct {
	db *pgxpool.Pool
}

var _ commands.CategoryRepository = (*CategoryRepo)(nil)

func NewCategoryRepository(db *pgxpool.Pool) (*CategoryRepo, error) {
	if db == nil {
		return nil, errors.New("db can't be nil")
	}

	return &CategoryRepo{db: db}, nil
}

func (r *CategoryRepo) UpsertCategories(ctx context.Context, categories []models.Category) error {
	err := commonDb.UpdateInSerializableTx(ctx, r.db, func(ctx context.Context, tx pgx.Tx) error {
		return saveCategories(ctx, dbmodels.New(tx), categories)
	})
	if err != nil {
		var cerr common.Error
		if errors.As(err, &cerr) {
			return err
		}

		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgUniqueViolation {
			return common.NewConflictError("category-name-taken", "a category with this name already exists")
		}

		return fmt.Errorf("upsert categories: %w", err)
	}

	return nil
}

// flatten returns each category followed by its sub-categories, so a parent is
// always saved before its children.
func flatten(categories []models.Category) []models.Category {
	flat := make([]models.Category, 0, len(categories))
	for _, c := range categories {
		flat = append(flat, c)
		flat = append(flat, c.Children...)
	}

	return flat
}

func saveCategories(
	ctx context.Context,
	q *dbmodels.Queries,
	categories []models.Category,
) error {
	items := flatten(categories)

	seen := make(map[models.CategoryUUID]struct{}, len(items))
	for _, c := range items {
		if _, dup := seen[c.UUID]; dup {
			return common.NewInvalidInputError("duplicate-category", "category %s is sent more than once", c.UUID.String())
		}
		seen[c.UUID] = struct{}{}
	}

	// Only parents are read; the rows being saved are handled by the upsert.
	var parentUUIDs []common.UUID
	for _, c := range items {
		if c.ParentUUID != nil {
			parentUUIDs = append(parentUUIDs, c.ParentUUID.UUID)
		}
	}

	rows, err := q.ListCategoriesByUUIDs(ctx, parentUUIDs)
	if err != nil {
		return err
	}

	// known maps a category to its parent (nil for top-level): the loaded
	// parents first, then each item once it is saved.
	known := make(map[models.CategoryUUID]*models.CategoryUUID, len(rows)+len(items))
	for _, row := range rows {
		known[row.Uuid] = row.ParentUuid
	}

	for _, c := range items {
		if err := checkParent(c, known, seen); err != nil {
			return err
		}

		affected, err := q.UpsertCategory(ctx, dbmodels.UpsertCategoryParams{
			Uuid:        c.UUID,
			ParentUuid:  c.ParentUUID,
			Name:        c.Name,
			Description: c.Description,
		})
		if err != nil {
			return err
		}
		if affected == 0 {
			return common.NewInvalidInputError("parent-category-invalid", "category %s cannot move to another parent", c.UUID.String())
		}

		known[c.UUID] = c.ParentUUID
	}

	return nil
}

// checkParent makes sure a parent is a top-level category.
func checkParent(
	c models.Category,
	known map[models.CategoryUUID]*models.CategoryUUID,
	inBatch map[models.CategoryUUID]struct{},
) error {
	if c.ParentUUID == nil {
		return nil
	}

	grandParent, ok := known[*c.ParentUUID]
	if !ok {
		if _, batched := inBatch[*c.ParentUUID]; batched {
			// A parent of the batch is saved before its children, so it would
			// be known by now; this one comes later.
			return common.NewInvalidInputError("parent-category-invalid", "parent category %s must be listed before its sub-categories", c.ParentUUID.String())
		}

		return common.NewNotFoundError("category-not-found", "parent category %s was not found", c.ParentUUID.String())
	}
	if grandParent != nil {
		return common.NewInvalidInputError("parent-category-invalid", "parent category %s is a sub-category", c.ParentUUID.String())
	}

	return nil
}
