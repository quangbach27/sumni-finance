package http

import (
	"context"
	"errors"

	common "github.com/quangbach27/golang-common"
	"github.com/quangbach27/golang-common/http/auth"

	"backend/internal/ledgers/apps/commands"
	"backend/internal/ledgers/apps/models"
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

func (h *Handlers) PostLedgerEntries(ctx context.Context, request PostLedgerEntriesRequestObject) (PostLedgerEntriesResponseObject, error) {
	body := request.Body

	entries := make([]commands.LedgerEntryInput, 0, len(body.Entries))
	for _, e := range body.Entries {
		entries = append(entries, commands.LedgerEntryInput{
			FundSourceUUID: e.FundSourceUuid,
			Amount:         e.Amount,
			Direction:      e.Direction,
			Description:    e.Description,
			OccurredAt:     e.OccurredAt,
			CategoryUUID:   e.CategoryUuid,
		})
	}

	entryUUIDs, err := h.commandHandlers.PostLedgerEntries(ctx, commands.PostLedgerEntries{
		LedgerPeriodUUID: request.LedgerPeriodUuid,
		Entries:          entries,
	})
	if err != nil {
		return nil, err
	}

	return PostLedgerEntries201JSONResponse{LedgerEntryUuids: entryUUIDs}, nil
}

func (h *Handlers) CloseLedgerPeriod(ctx context.Context, request CloseLedgerPeriodRequestObject) (CloseLedgerPeriodResponseObject, error) {
	if err := h.commandHandlers.CloseLedgerPeriod(ctx, commands.CloseLedgerPeriod{
		LedgerPeriodUUID: request.LedgerPeriodUuid,
	}); err != nil {
		return nil, err
	}

	return CloseLedgerPeriod204Response{}, nil
}

func (h *Handlers) ReopenLedgerPeriod(ctx context.Context, request ReopenLedgerPeriodRequestObject) (ReopenLedgerPeriodResponseObject, error) {
	if err := h.commandHandlers.ReopenLedgerPeriod(ctx, commands.ReopenLedgerPeriod{
		LedgerPeriodUUID: request.LedgerPeriodUuid,
		Reason:           request.Body.Reason,
	}); err != nil {
		return nil, err
	}

	return ReopenLedgerPeriod204Response{}, nil
}

func (h *Handlers) GenerateLedgerPeriodReport(ctx context.Context, request GenerateLedgerPeriodReportRequestObject) (GenerateLedgerPeriodReportResponseObject, error) {
	reportUUID, err := h.commandHandlers.GenerateLedgerPeriodReport(ctx, commands.GenerateLedgerPeriodReport{
		LedgerPeriodUUID: request.LedgerPeriodUuid,
	})
	if err != nil {
		return nil, err
	}

	return GenerateLedgerPeriodReport200JSONResponse{ReportUuid: reportUUID}, nil
}

func (h *Handlers) ReconcileLedgerPeriod(ctx context.Context, request ReconcileLedgerPeriodRequestObject) (ReconcileLedgerPeriodResponseObject, error) {
	if err := h.commandHandlers.ReconcileLedgerPeriod(ctx, commands.ReconcileLedgerPeriod{
		LedgerPeriodUUID: request.LedgerPeriodUuid,
	}); err != nil {
		return nil, err
	}

	return ReconcileLedgerPeriod204Response{}, nil
}

func (h *Handlers) ReconcileFundSourceStatements(ctx context.Context, request ReconcileFundSourceStatementsRequestObject) (ReconcileFundSourceStatementsResponseObject, error) {
	session, ok := auth.SessionFromContext(ctx)
	if !ok || session == nil {
		return nil, common.NewUnauthorizedError("session-required", "an authenticated session is required")
	}

	statements := make([]domain.StatementActualBalance, 0, len(request.Body.Statements))
	for _, s := range request.Body.Statements {
		statements = append(statements, domain.StatementActualBalance{
			StatementUUID: s.StatementUuid,
			ActualBalance: s.ActualBalance,
		})
	}

	if err := h.commandHandlers.ReconcileFundSourceStatements(ctx, commands.ReconcileFundSourceStatements{
		LedgerPeriodUUID: request.LedgerPeriodUuid,
		ReconciledBy:     session.Subject,
		Statements:       statements,
	}); err != nil {
		return nil, err
	}

	return ReconcileFundSourceStatements204Response{}, nil
}

func (h *Handlers) ListFundSourceStatements(ctx context.Context, request ListFundSourceStatementsRequestObject) (ListFundSourceStatementsResponseObject, error) {
	statements, err := h.queryHandlers.ListFundSourceStatements(ctx, queries.ListFundSourceStatements{
		LedgerPeriodUUID: request.LedgerPeriodUuid,
	})
	if err != nil {
		return nil, err
	}

	items := make([]FundSourceStatement, 0, len(statements))
	for _, st := range statements {
		items = append(items, FundSourceStatement{
			Uuid:           domain.FundSourceStatementUUID{UUID: common.MustUUIDFromString(st.UUID)},
			FundSourceUuid: domain.FundSourceUUID{UUID: common.MustUUIDFromString(st.FundSourceUUID)},
			OpeningBalance: st.OpeningBalance,
			ClosingBalance: st.ClosingBalance,
			ActualBalance:  st.ActualBalance,
			ReconciledBy:   st.ReconciledBy,
			ReconciledAt:   st.ReconciledAt,
		})
	}

	return ListFundSourceStatements200JSONResponse{Items: items}, nil
}

func (h *Handlers) ListLedgerPeriods(ctx context.Context, request ListLedgerPeriodsRequestObject) (ListLedgerPeriodsResponseObject, error) {
	params := request.Params

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

func (h *Handlers) GetLedgerPeriod(ctx context.Context, request GetLedgerPeriodRequestObject) (GetLedgerPeriodResponseObject, error) {
	period, err := h.queryHandlers.GetLedgerPeriod(ctx, queries.GetLedgerPeriod{LedgerPeriodUUID: request.LedgerPeriodUuid})
	if err != nil {
		return nil, err
	}

	return GetLedgerPeriod200JSONResponse{LedgerPeriod: toAPILedgerPeriodDetail(period)}, nil
}

func (h *Handlers) GetUnlockedLedgerPeriod(ctx context.Context, _ GetUnlockedLedgerPeriodRequestObject) (GetUnlockedLedgerPeriodResponseObject, error) {
	period, err := h.queryHandlers.GetUnlockedLedgerPeriod(ctx, queries.GetUnlockedLedgerPeriod{})
	if err != nil {
		return nil, err
	}

	return GetUnlockedLedgerPeriod200JSONResponse{LedgerPeriod: toAPILedgerPeriodDetail(period)}, nil
}

func toAPILedgerPeriodDetail(period queries.LedgerPeriodDetail) LedgerPeriodDetail {
	statements := make([]LedgerStatementDetail, 0, len(period.Statements))
	for _, st := range period.Statements {
		statements = append(statements, LedgerStatementDetail{
			Uuid:           domain.FundSourceStatementUUID{UUID: common.MustUUIDFromString(st.UUID)},
			OpeningBalance: st.OpeningBalance,
			ClosingBalance: st.ClosingBalance,
			ActualBalance:  st.ActualBalance,
			ReconciledBy:   st.ReconciledBy,
			ReconciledAt:   st.ReconciledAt,
			FundSource:     toAPIFundSource(st.FundSource),
		})
	}

	base := toAPILedgerPeriod(period.LedgerPeriod)

	return LedgerPeriodDetail{
		Uuid:           base.Uuid,
		Name:           base.Name,
		OpeningBalance: base.OpeningBalance,
		ClosingBalance: base.ClosingBalance,
		OpenDate:       base.OpenDate,
		CloseDate:      base.CloseDate,
		Status:         base.Status,
		ReopenReason:   base.ReopenReason,
		ReopenedAt:     base.ReopenedAt,
		ReconciledAt:   base.ReconciledAt,
		ReportUuid:     base.ReportUuid,
		TotalInflow:    period.TotalInflow,
		TotalOutflow:   period.TotalOutflow,
		EntryCount:     period.EntryCount,
		Statements:     statements,
	}
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
		ReportUuid:     toAPIReportUUID(p.ReportUUID),
	}
}

func toAPIReportUUID(id *string) *models.ReportUUID {
	if id == nil {
		return nil
	}

	return &models.ReportUUID{UUID: common.MustUUIDFromString(*id)}
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
