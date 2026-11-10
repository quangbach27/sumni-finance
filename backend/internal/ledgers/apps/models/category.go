package models

import (
	"strconv"
	"strings"

	common "github.com/quangbach27/golang-common"
)

// CategoryUUID identifies a category or a sub-category (one tree, two levels).
type CategoryUUID struct {
	common.UUID
}

// Category is a category of a ledger period, or a sub-category when ParentUUID
// is set. Sub-categories sit in Children of their category; they cannot have
// children themselves (two levels at most).
type Category struct {
	UUID        CategoryUUID
	ParentUUID  *CategoryUUID
	Name        string
	Description *string
	Children    []Category
}

// NewCategory validates the fields and returns the category. Failures are
// collected; the ones of a child carry the child index as the entity id.
func NewCategory(
	uuid CategoryUUID,
	parentUUID *CategoryUUID,
	name string,
	description *string,
	children []Category,
) (Category, error) {
	var details []common.ErrorDetails

	add := func(entityID, slug, msg string) {
		details = append(details, common.ErrorDetails{EntityType: "category", EntityID: entityID, ErrorSlug: slug, Message: msg})
	}

	name = strings.TrimSpace(name)
	if name == "" {
		add("", "category-name-required", "category name is required")
	}
	if uuid.IsZero() {
		add("", "category-uuid-required", "category uuid is required")
	}
	if parentUUID != nil && parentUUID.IsZero() {
		add("", "parent-category-invalid", "parent category is invalid")
	}
	if parentUUID != nil && len(children) > 0 {
		add("", "category-too-deep", "a sub-category cannot have sub-categories")
	}

	for i, child := range children {
		idx := strconv.Itoa(i)

		if child.ParentUUID == nil || *child.ParentUUID != uuid {
			add(idx, "parent-category-invalid", "sub-category must belong to its category")
		}
		if len(child.Children) > 0 {
			add(idx, "category-too-deep", "a sub-category cannot have sub-categories")
		}
	}

	if len(details) > 0 {
		return Category{}, common.NewInvalidInputError("invalid-category", "invalid category").WithDetails(details)
	}

	return Category{
		UUID:        uuid,
		ParentUUID:  parentUUID,
		Name:        name,
		Description: trimOptional(description),
		Children:    children,
	}, nil
}

// trimOptional turns a blank description into nil.
func trimOptional(s *string) *string {
	if s == nil {
		return nil
	}

	v := strings.TrimSpace(*s)
	if v == "" {
		return nil
	}

	return &v
}
