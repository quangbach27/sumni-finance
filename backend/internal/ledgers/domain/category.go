package domain

import common "github.com/quangbach27/golang-common"

type CategoryUUID struct {
	common.UUID
}

type Category struct {
	uuid CategoryUUID

	name string
}
