package http

import (
	"backend/internal/ledgers/apps/commands"
	"backend/internal/ledgers/apps/queries"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
	"context"
	"errors"

	common "github.com/quangbach27/golang-common"
)

type Handlers struct {
	commandHandlers *commands.Handlers
	queryHandlers   *queries.Handlers
}

var _ StrictServerInterface = (*Handlers)(nil)

func NewHandlers(
	commandHandlers *commands.Handlers,
	queryHandlers *queries.Handlers,
) (*Handlers, error) {
	var errs []error

	if commandHandlers == nil {
		errs = append(errs, errors.New("command handlers can't be nil"))
	}

	if queryHandlers == nil {
		errs = append(errs, errors.New("query handlers can't be nil"))
	}

	if len(errs) != 0 {
		return nil, errors.Join(errs...)
	}

	return &Handlers{
		commandHandlers: commandHandlers,
		queryHandlers:   queryHandlers,
	}, nil
}

func Register(router EchoRouter, handlers *Handlers) {
	RegisterHandlers(
		router,
		NewStrictHandler(handlers, nil),
	)
}

func (h *Handlers) CreateFundSource(ctx context.Context, request CreateFundSourceRequestObject) (CreateFundSourceResponseObject, error) {
	body := request.Body

	cmd := commands.CreateFundSource{
		Name:         body.Name,
		Type:         body.Type,
		StartBalance: body.StartBalance,
		Currency:     body.Currency,
		OwnerName:    body.Details.OwnerName,
	}

	// Missing bank fields become "" so the domain factory reports them.
	if body.Type == domain.FundSourceTypeBank {
		cmd.Bank = &commands.BankInput{
			BankCode:      deref(body.Details.BankCode),
			BankBin:       deref(body.Details.BankBin),
			BankShortName: deref(body.Details.BankShortName),
			AccountNumber: deref(body.Details.AccountNumber),
		}
	}

	fundSourceUUID, err := h.commandHandlers.CreateFundSource(ctx, cmd)
	if err != nil {
		return nil, err
	}

	return CreateFundSource201JSONResponse{FundSourceUuid: fundSourceUUID}, nil
}

func (h *Handlers) ListFundSources(ctx context.Context, _ ListFundSourcesRequestObject) (ListFundSourcesResponseObject, error) {
	fundSources, err := h.queryHandlers.ListFundSources(ctx, queries.ListFundSources{})
	if err != nil {
		return nil, err
	}

	items := make([]FundSource, 0, len(fundSources))
	for _, fs := range fundSources {
		items = append(items, toAPIFundSource(fs))
	}

	return ListFundSources200JSONResponse{FundSources: items}, nil
}

func toAPIFundSource(fs queries.FundSource) FundSource {
	details := FundSourceDetails{OwnerName: fs.Details.OwnerName}
	if bank := fs.Details.Bank; bank != nil {
		details.BankCode = &bank.BankCode
		details.BankBin = &bank.BankBin
		details.BankShortName = &bank.BankShortName
		details.AccountNumber = &bank.AccountNumber
	}

	return FundSource{
		Uuid:     domain.FundSourceUUID{UUID: common.MustUUIDFromString(fs.UUID)},
		Name:     fs.Name,
		Type:     common.MustEnum[domain.FundSourceType](fs.Type),
		Balance:  fs.Balance,
		Currency: common.MustEnum[shared.Currency](fs.Currency),
		Details:  details,
	}
}

func deref(s *string) string {
	if s == nil {
		return ""
	}

	return *s
}
