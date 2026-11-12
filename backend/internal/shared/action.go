package shared

import common "github.com/quangbach27/golang-common"

// Action is something a user can do to a Resource.
type Action struct {
	common.Enum[ActionValues]
}

type ActionValues string

func (v ActionValues) Values() []string {
	return []string{"read", "create", "update", "delete"}
}

var (
	ActionRead   = common.MustEnum[Action]("read")
	ActionCreate = common.MustEnum[Action]("create")
	ActionUpdate = common.MustEnum[Action]("update")
	ActionDelete = common.MustEnum[Action]("delete")
)

// AllActions returns every action. The slice is a copy.
func AllActions() []Action {
	return []Action{ActionRead, ActionCreate, ActionUpdate, ActionDelete}
}
