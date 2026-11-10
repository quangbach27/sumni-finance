package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"backend/internal/ledgers/adapters/db/dbmodels"
	"backend/internal/ledgers/apps/models"
	"backend/internal/ledgers/apps/queries"
)

type CategoryReadModel struct {
	db *pgxpool.Pool
}

var _ queries.CategoryReadModel = (*CategoryReadModel)(nil)

func NewCategoryReadModel(db *pgxpool.Pool) (*CategoryReadModel, error) {
	if db == nil {
		return nil, errors.New("db can't be nil")
	}

	return &CategoryReadModel{db: db}, nil
}

// ListCategories returns all categories, each with its sub-categories.
func (r *CategoryReadModel) ListCategories(ctx context.Context) ([]queries.Category, error) {
	rows, err := dbmodels.New(r.db).ListCategories(ctx)
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}

	items := make([]queries.Category, 0, len(rows))
	index := make(map[models.CategoryUUID]int, len(rows))

	// Rows are sorted by name only, so place every top-level category first.
	for _, row := range rows {
		if row.ParentUuid != nil {
			continue
		}

		index[row.Uuid] = len(items)
		items = append(items, categoryToDTO(row))
	}

	for _, row := range rows {
		if row.ParentUuid == nil {
			continue
		}

		if i, ok := index[*row.ParentUuid]; ok {
			items[i].SubCategories = append(items[i].SubCategories, categoryToDTO(row))
		}
	}

	return items, nil
}

func categoryToDTO(row dbmodels.LedgersCategory) queries.Category {
	return queries.Category{
		UUID:          row.Uuid.String(),
		Name:          row.Name,
		Description:   row.Description,
		SubCategories: []queries.Category{},
	}
}
