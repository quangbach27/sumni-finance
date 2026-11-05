package shared

import common "github.com/quangbach27/golang-common"

type Direction struct {
	common.Enum[DirectionValues]
}

type DirectionValues string

func (v DirectionValues) Values() []string {
	return []string{"inflow", "outflow"}
}

var (
	DirectionInflow  = common.MustEnum[Direction]("inflow")
	DirectionOutflow = common.MustEnum[Direction]("outflow")
)
