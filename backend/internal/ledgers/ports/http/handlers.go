package http

import (
	"context"
	"errors"

	common "github.com/quangbach27/golang-common"
	"github.com/quangbach27/golang-common/log"

	"backend/internal/ledgers/apps/commands"
	"backend/internal/ledgers/apps/queries"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
	"backend/internal/utils"
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

	// Missing bank fields become zero values (0 for bin) so the domain factory reports them.
	if body.Type == domain.FundSourceTypeBank {
		cmd.Bank = &commands.BankInput{
			BankCode:      utils.SafeDeref(body.Details.BankCode, ""),
			BankBin:       utils.SafeDeref(body.Details.BankBin, 0),
			BankShortName: utils.SafeDeref(body.Details.BankShortName, ""),
			AccountNumber: utils.SafeDeref(body.Details.AccountNumber, ""),
		}
	}

	fundSourceUUID, err := h.commandHandlers.CreateFundSource(ctx, cmd)
	if err != nil {
		return nil, err
	}

	return CreateFundSource201JSONResponse{FundSourceUuid: fundSourceUUID}, nil
}

func (h *Handlers) OpenLedgerPeriod(ctx context.Context, request OpenLedgerPeriodRequestObject) (OpenLedgerPeriodResponseObject, error) {
	body := request.Body

	periodUUID, err := h.commandHandlers.OpenLedgerPeriod(ctx, commands.OpenLedgerPeriod{
		Name:            body.Name,
		OpenDate:        body.OpenDate,
		CloseDate:       body.CloseDate,
		FundSourceUUIDs: body.FundSourceUuids,
	})
	if err != nil {
		return nil, err
	}

	return OpenLedgerPeriod201JSONResponse{LedgerPeriodUuid: periodUUID}, nil
}

func (h *Handlers) ListLedgerPeriods(ctx context.Context, request ListLedgerPeriodsRequestObject) (ListLedgerPeriodsResponseObject, error) {
	params := request.Params

	log.FromContext(ctx).Info("list params", "params", params)

	// Missing params become zero values, which NewPageRequest turns into the defaults.
	page, err := shared.NewPageRequest(utils.SafeDeref(params.Page, 0), utils.SafeDeref(params.PageSize, 20))
	if err != nil {
		return nil, err
	}

	result, err := h.queryHandlers.ListLedgerPeriods(ctx, queries.ListLedgerPeriods{
		Page:   page,
		Status: params.Status,
	})
	if err != nil {
		return nil, err
	}

	items := make([]LedgerPeriod, 0, len(result.Items))
	for _, p := range result.Items {
		items = append(items, toAPILedgerPeriod(p))
	}

	return ListLedgerPeriods200JSONResponse{
		Items: items,
		PageInfo: PageInfo{
			Page:       result.Page.Page,
			PageSize:   result.Page.PageSize,
			TotalCount: result.Page.TotalCount,
		},
	}, nil
}

func toAPILedgerPeriod(p queries.LedgerPeriod) LedgerPeriod {
	return LedgerPeriod{
		Uuid:           domain.LedgerPeriodUUID{UUID: common.MustUUIDFromString(p.UUID)},
		Name:           p.Name,
		OpeningBalance: p.OpeningBalance,
		ClosingBalance: p.ClosingBalance,
		OpenDate:       p.OpenDate,
		CloseDate:      p.CloseDate,
		Status:         common.MustEnum[domain.LedgerStatus](p.Status),
		ReopenReason:   p.ReopenReason,
		ReopenedAt:     p.ReopenedAt,
		ReconciledAt:   p.ReconciledAt,
	}
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
