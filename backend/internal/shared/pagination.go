package shared

import common "github.com/quangbach27/golang-common"

const (
	DefaultPage     = 1
	DefaultPageSize = 20
	MaxPageSize     = 100
)

// PageInfo describes the page of a paginated result.
type PageInfo struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	TotalCount int `json:"total_count"`
}

// PagedResult is the common shape of every paginated list.
type PagedResult[T any] struct {
	Items []T      `json:"items"`
	Page  PageInfo `json:"page_info"`
}

// PageRequest is a validated page selection.
type PageRequest struct {
	Page     int
	PageSize int
}

// NewPageRequest applies the defaults to zero values and validates the bounds.
func NewPageRequest(page, pageSize int) (PageRequest, error) {
	if page == 0 {
		page = DefaultPage
	}
	if pageSize == 0 {
		pageSize = DefaultPageSize
	}

	if page < 1 {
		return PageRequest{}, common.NewInvalidInputError("invalid-pagination", "page must be at least 1")
	}
	if pageSize < 1 || pageSize > MaxPageSize {
		return PageRequest{}, common.NewInvalidInputError("invalid-pagination", "page size must be between 1 and %d", MaxPageSize)
	}

	return PageRequest{Page: page, PageSize: pageSize}, nil
}

func (p PageRequest) Limit() int  { return p.PageSize }
func (p PageRequest) Offset() int { return (p.Page - 1) * p.PageSize }

// NewPagedResult builds a result for the requested page.
func NewPagedResult[T any](
	items []T,
	req PageRequest,
	totalCount int,
) PagedResult[T] {
	return PagedResult[T]{
		Items: items,
		Page: PageInfo{
			Page:       req.Page,
			PageSize:   req.PageSize,
			TotalCount: totalCount,
		},
	}
}
