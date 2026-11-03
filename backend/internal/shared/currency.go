package shared

import common "github.com/quangbach27/golang-common"

type Currency struct {
	common.Enum[CurrencyValues]
}

type CurrencyValues string

func (v CurrencyValues) Values() []string {
	return []string{"VND"}
}
