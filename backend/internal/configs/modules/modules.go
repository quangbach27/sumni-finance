package modules

import (
	"context"

	"github.com/labstack/echo/v5"

	"backend/internal/configs/modules/contracts"
)

type EchoRouter interface {
	CONNECT(path string, h echo.HandlerFunc, m ...echo.MiddlewareFunc) echo.RouteInfo
	DELETE(path string, h echo.HandlerFunc, m ...echo.MiddlewareFunc) echo.RouteInfo
	GET(path string, h echo.HandlerFunc, m ...echo.MiddlewareFunc) echo.RouteInfo
	HEAD(path string, h echo.HandlerFunc, m ...echo.MiddlewareFunc) echo.RouteInfo
	OPTIONS(path string, h echo.HandlerFunc, m ...echo.MiddlewareFunc) echo.RouteInfo
	PATCH(path string, h echo.HandlerFunc, m ...echo.MiddlewareFunc) echo.RouteInfo
	POST(path string, h echo.HandlerFunc, m ...echo.MiddlewareFunc) echo.RouteInfo
	PUT(path string, h echo.HandlerFunc, m ...echo.MiddlewareFunc) echo.RouteInfo
	TRACE(path string, h echo.HandlerFunc, m ...echo.MiddlewareFunc) echo.RouteInfo
}

type Name string

const (
	LedgersModuleName Name = "ledgers"
	// AuthorizationModuleName is also the Postgres schema name. It is not
	// "authorization" because that is a reserved word in Postgres.
	AuthorizationModuleName Name = "authz"
)

type Module interface {
	Name() Name
	Init(ctx context.Context) error
	RegisterHttp(ctx context.Context, router EchoRouter) error
	RegisterContracts(ctx context.Context, contracts *contracts.Contracts) error
}
