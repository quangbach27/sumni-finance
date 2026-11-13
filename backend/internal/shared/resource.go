package shared

import (
	"database/sql/driver"
	"fmt"
	"strings"

	common "github.com/quangbach27/golang-common"
)

// Resource is a kind of thing access can be checked or granted on.
// New modules add their resources here.
type Resource struct {
	common.Enum[ResourceValues]
}

type ResourceValues string

func (v ResourceValues) Values() []string {
	return []string{
		"ledger_period",
		"ledger_entry",
		"fund_source",
		"access_grant",
		"ledger_category",
	}
}

var (
	ResourceLedgerPeriod   = common.MustEnum[Resource]("ledger_period")
	ResourceLedgerEntry    = common.MustEnum[Resource]("ledger_entry")
	ResourceFundSource     = common.MustEnum[Resource]("fund_source")
	ResourceAccessGrant    = common.MustEnum[Resource]("access_grant")
	ResourceLedgerCategory = common.MustEnum[Resource]("ledger_category")
)

// AllResources returns every resource. The slice is a copy.
func AllResources() []Resource {
	return []Resource{ResourceLedgerPeriod, ResourceLedgerEntry, ResourceFundSource, ResourceAccessGrant, ResourceLedgerCategory}
}

// ResourceScope points at one instance of a resource, written "resource/id"
// (e.g. "fund_source/123"). The id is a plain string so the authorization module
// does not depend on other modules' id types.
type ResourceScope struct {
	resource Resource
	id       string
}

func NewResourceScope(resource Resource, id string) (ResourceScope, error) {
	if resource.IsZero() {
		return ResourceScope{}, common.NewInvalidInputError("resource-required", "resource is required")
	}

	if id == "" {
		return ResourceScope{}, common.NewInvalidInputError("resource-id-required", "resource id is required")
	}

	return ResourceScope{resource: resource, id: id}, nil
}

func (r ResourceScope) Resource() Resource { return r.resource }
func (r ResourceScope) ID() string         { return r.id }
func (r ResourceScope) IsZero() bool       { return r.resource.IsZero() && r.id == "" }

// String returns "resource/id", or "" for the zero value.
func (r ResourceScope) String() string {
	if r.IsZero() {
		return ""
	}

	return r.resource.String() + "/" + r.id
}

func (r ResourceScope) MarshalText() ([]byte, error) {
	return []byte(r.String()), nil
}

// UnmarshalText parses "resource/id". It splits at the first "/", so the id may
// itself contain "/". Empty text leaves the zero value.
func (r *ResourceScope) UnmarshalText(text []byte) error {
	if len(text) == 0 {
		*r = ResourceScope{}
		return nil
	}

	resourceText, id, found := strings.Cut(string(text), "/")
	if !found {
		return common.NewInvalidInputError("invalid-resource-scope", "scope %q must look like resource/id", text)
	}

	resource, err := common.NewEnum[Resource](resourceText)
	if err != nil || resource.IsZero() || id == "" {
		return common.NewInvalidInputError("invalid-resource-scope", "scope %q must look like resource/id", text)
	}

	*r = ResourceScope{resource: resource, id: id}
	return nil
}

// Value stores the scope as "resource/id" in a text column.
func (r ResourceScope) Value() (driver.Value, error) {
	return r.String(), nil
}

func (r *ResourceScope) Scan(src any) error {
	switch v := src.(type) {
	case nil:
		*r = ResourceScope{}
		return nil
	case string:
		return r.UnmarshalText([]byte(v))
	case []byte:
		return r.UnmarshalText(v)
	default:
		return fmt.Errorf("invalid type for resource scope: %T, expected string", src)
	}
}
