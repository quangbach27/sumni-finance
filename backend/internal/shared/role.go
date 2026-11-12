package shared

import common "github.com/quangbach27/golang-common"

// Role is the coarse role assigned to a user by the identity provider.
type Role struct {
	common.Enum[RoleValues]
}

type RoleValues string

func (v RoleValues) Values() []string {
	return []string{
		"office-admin",
		"office-accountant",
		"office-viewer",
	}
}

var (
	RoleOfficeAdmin      = common.MustEnum[Role]("office-admin")
	RoleOfficeAccountant = common.MustEnum[Role]("office-accountant")
	RoleOfficeViewer     = common.MustEnum[Role]("office-viewer")
)
