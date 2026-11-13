package commands

import (
	"context"
	"errors"
	"strconv"

	common "github.com/quangbach27/golang-common"
	"github.com/quangbach27/golang-common/http/auth"
	"github.com/quangbach27/golang-common/log"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/apps/models"
	"backend/internal/shared"
)

// CategoryRepository saves categories, which are shared by all ledger periods.
type CategoryRepository interface {
	// UpsertCategories saves the categories with their sub-categories in one
	// transaction: an existing UUID updates the name and description, a new
	// one inserts.
	UpsertCategories(ctx context.Context, orgID string, categories []models.Category) error
}

type SubCategoryInput struct {
	// UUID updates the sub-category when set; otherwise a new one is created.
	UUID        *models.CategoryUUID
	Name        string
	Description *string
}

type CategoryInput struct {
	// UUID updates the category when set; otherwise a new one is created.
	UUID          *models.CategoryUUID
	Name          string
	Description   *string
	SubCategories []SubCategoryInput
}

type UpsertCategory struct {
	Session    *auth.Session
	Categories []CategoryInput
}

// UpsertCategory creates or updates categories together with their
// sub-categories. To add a sub-category to an existing category, send the
// category's UUID and name with the new sub-category. Sub-categories that are
// not sent are left as they are. It returns the saved category UUIDs in the
// order of cmd.Categories.
func (h *Handlers) UpsertCategory(ctx context.Context, cmd UpsertCategory) ([]models.CategoryUUID, error) {
	res, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  cmd.Session,
		Resource: shared.ResourceLedgerCategory,
		Action:   shared.ActionCreate,
	})
	if err != nil {
		return nil, err
	}

	if len(cmd.Categories) == 0 {
		return nil, common.NewInvalidInputError("categories-required", "at least one category is required")
	}

	categories, err := buildCategories(cmd)
	if err != nil {
		return nil, err
	}

	if err := h.categoryRepo.UpsertCategories(ctx, res.OrgID, categories); err != nil {
		return nil, err
	}

	uuids := make([]models.CategoryUUID, 0, len(categories))
	for _, c := range categories {
		uuids = append(uuids, c.UUID)
	}

	log.FromContext(ctx).With("categoryCount", len(categories)).Info("categories saved")

	return uuids, nil
}

func newCategoryUUID(in *models.CategoryUUID) models.CategoryUUID {
	if in != nil {
		return *in
	}

	return models.CategoryUUID{UUID: common.NewUUIDv7()}
}

// buildCategories creates the models. Validation failures of all categories
// and sub-categories are returned together, each detail tagged with the index
// path ("1" for a category, "1.0" for its first sub-category).
func buildCategories(cmd UpsertCategory) ([]models.Category, error) {
	categories := make([]models.Category, 0, len(cmd.Categories))

	var details []common.ErrorDetails

	collect := func(prefix string, err error) error {
		var cerr common.Error
		if !errors.As(err, &cerr) {
			return err
		}

		for _, d := range cerr.Details {
			if d.EntityID == "" {
				d.EntityID = prefix
			} else {
				d.EntityID = prefix + "." + d.EntityID
			}
			details = append(details, d)
		}

		return nil
	}

	for i, in := range cmd.Categories {
		parentUUID := newCategoryUUID(in.UUID)
		prefix := strconv.Itoa(i)

		children := make([]models.Category, 0, len(in.SubCategories))
		for j, sub := range in.SubCategories {
			child, err := models.NewCategory(newCategoryUUID(sub.UUID), &parentUUID, sub.Name, sub.Description, nil)
			if err != nil {
				if err := collect(prefix+"."+strconv.Itoa(j), err); err != nil {
					return nil, err
				}

				continue
			}

			children = append(children, child)
		}

		category, err := models.NewCategory(parentUUID, nil, in.Name, in.Description, children)
		if err != nil {
			if err := collect(prefix, err); err != nil {
				return nil, err
			}

			continue
		}

		categories = append(categories, category)
	}

	if len(details) > 0 {
		return nil, common.NewInvalidInputError("invalid-categories", "invalid categories").WithDetails(details)
	}

	return categories, nil
}
