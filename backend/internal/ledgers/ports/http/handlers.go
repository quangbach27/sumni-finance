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

// organizationKey is the session claim that carries the Clerk org id.
const organizationKey = "organization"

// orgIDFromRequest returns the Clerk org id of the request session. Every ledgers
// command and query is scoped to it.
func orgIDFromRequest(ctx context.Context) (string, error) {
	session, ok := auth.SessionFromContext(ctx)
	if !ok || session == nil {
		return "", common.NewUnauthorizedError("session-required", "an authenticated session is required")
	}

	orgID, _ := session.Extra[organizationKey].(string)
	if orgID == "" {
		return "", common.NewUnauthorizedError("org-id-required", "an organization is required")
	}

	return orgID, nil
}

func (h *Handlers) CreateFundSource(ctx context.Context, request CreateFundSourceRequestObject) (CreateFundSourceResponseObject, error) {
	orgID, err := orgIDFromRequest(ctx)
	if err != nil {
		return nil, err
	}

	body := request.Body

	cmd := commands.CreateFundSource{
		OrgID:        orgID,
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
	orgID, err := orgIDFromRequest(ctx)
	if err != nil {
		return nil, err
	}

	body := request.Body

	periodUUID, err := h.commandHandlers.OpenLedgerPeriod(ctx, commands.OpenLedgerPeriod{
		OrgID:           orgID,
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
	orgID, err := orgIDFromRequest(ctx)
	if err != nil {
		return nil, err
	}

	body := request.Body

	entries := make([]commands.LedgerEntryInput, 0, len(body.Entries))
	for _, e := range body.Entries {
		entries = append(entries, commands.LedgerEntryInput{
			Amount:       e.Amount,
			Direction:    e.Direction,
			Description:  e.Description,
			OccurredAt:   e.OccurredAt,
			CategoryUUID: e.CategoryUuid,
		})
	}

	entryUUIDs, err := h.commandHandlers.PostLedgerEntries(ctx, commands.PostLedgerEntries{
		OrgID:            orgID,
		LedgerPeriodUUID: request.LedgerPeriodUuid,
		FundSourceUUID:   body.FundSourceUuid,
		Entries:          entries,
	})
	if err != nil {
		return nil, err
	}

	return PostLedgerEntries201JSONResponse{LedgerEntryUuids: entryUUIDs}, nil
}

func (h *Handlers) CloseLedgerPeriod(ctx context.Context, request CloseLedgerPeriodRequestObject) (CloseLedgerPeriodResponseObject, error) {
	orgID, err := orgIDFromRequest(ctx)
	if err != nil {
		return nil, err
	}

	if err := h.commandHandlers.CloseLedgerPeriod(ctx, commands.CloseLedgerPeriod{
		OrgID:            orgID,
		LedgerPeriodUUID: request.LedgerPeriodUuid,
	}); err != nil {
		return nil, err
	}

	return CloseLedgerPeriod204Response{}, nil
}

func (h *Handlers) ReopenLedgerPeriod(ctx context.Context, request ReopenLedgerPeriodRequestObject) (ReopenLedgerPeriodResponseObject, error) {
	orgID, err := orgIDFromRequest(ctx)
	if err != nil {
		return nil, err
	}

	if err := h.commandHandlers.ReopenLedgerPeriod(ctx, commands.ReopenLedgerPeriod{
		OrgID:            orgID,
		LedgerPeriodUUID: request.LedgerPeriodUuid,
		Reason:           request.Body.Reason,
	}); err != nil {
		return nil, err
	}

	return ReopenLedgerPeriod204Response{}, nil
}

func (h *Handlers) GenerateLedgerPeriodReport(ctx context.Context, request GenerateLedgerPeriodReportRequestObject) (GenerateLedgerPeriodReportResponseObject, error) {
	orgID, err := orgIDFromRequest(ctx)
	if err != nil {
		return nil, err
	}

	reportUUID, err := h.commandHandlers.GenerateLedgerPeriodReport(ctx, commands.GenerateLedgerPeriodReport{
		OrgID:            orgID,
		LedgerPeriodUUID: request.LedgerPeriodUuid,
	})
	if err != nil {
		return nil, err
	}

	return GenerateLedgerPeriodReport200JSONResponse{ReportUuid: reportUUID}, nil
}

func (h *Handlers) ReconcileLedgerPeriod(ctx context.Context, request ReconcileLedgerPeriodRequestObject) (ReconcileLedgerPeriodResponseObject, error) {
	orgID, err := orgIDFromRequest(ctx)
	if err != nil {
		return nil, err
	}

	if err := h.commandHandlers.ReconcileLedgerPeriod(ctx, commands.ReconcileLedgerPeriod{
		OrgID:            orgID,
		LedgerPeriodUUID: request.LedgerPeriodUuid,
	}); err != nil {
		return nil, err
	}

	return ReconcileLedgerPeriod204Response{}, nil
}

func (h *Handlers) ReconcileFundSourceStatements(ctx context.Context, request ReconcileFundSourceStatementsRequestObject) (ReconcileFundSourceStatementsResponseObject, error) {
	orgID, err := orgIDFromRequest(ctx)
	if err != nil {
		return nil, err
	}

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
		OrgID:            orgID,
		LedgerPeriodUUID: request.LedgerPeriodUuid,
		ReconciledBy:     session.Subject,
		Statements:       statements,
	}); err != nil {
		return nil, err
	}

	return ReconcileFundSourceStatements204Response{}, nil
}

func (h *Handlers) ListFundSourceStatements(ctx context.Context, request ListFundSourceStatementsRequestObject) (ListFundSourceStatementsResponseObject, error) {
	orgID, err := orgIDFromRequest(ctx)
	if err != nil {
		return nil, err
	}

	statements, err := h.queryHandlers.ListFundSourceStatements(ctx, queries.ListFundSourceStatements{
		OrgID:            orgID,
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
	orgID, err := orgIDFromRequest(ctx)
	if err != nil {
		return nil, err
	}

	params := request.Params

	// Missing params become zero values, which NewPageRequest turns into the defaults.
	page, err := shared.NewPageRequest(utils.SafeDeref(params.Page, 0), utils.SafeDeref(params.PageSize, 20))
	if err != nil {
		return nil, err
	}

	result, err := h.queryHandlers.ListLedgerPeriods(ctx, queries.ListLedgerPeriods{
		OrgID:  orgID,
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
	orgID, err := orgIDFromRequest(ctx)
	if err != nil {
		return nil, err
	}

	period, err := h.queryHandlers.GetLedgerPeriod(ctx, queries.GetLedgerPeriod{OrgID: orgID, LedgerPeriodUUID: request.LedgerPeriodUuid})
	if err != nil {
		return nil, err
	}

	return GetLedgerPeriod200JSONResponse{LedgerPeriod: toAPILedgerPeriodDetail(period)}, nil
}

func (h *Handlers) GetUnlockedLedgerPeriod(ctx context.Context, _ GetUnlockedLedgerPeriodRequestObject) (GetUnlockedLedgerPeriodResponseObject, error) {
	orgID, err := orgIDFromRequest(ctx)
	if err != nil {
		return nil, err
	}

	period, err := h.queryHandlers.GetUnlockedLedgerPeriod(ctx, queries.GetUnlockedLedgerPeriod{OrgID: orgID})
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

	summaries := make([]CategorySummary, 0, len(period.CategorySummaries))
	for _, cs := range period.CategorySummaries {
		summary := CategorySummary{
			EntryCount:   cs.EntryCount,
			TotalInflow:  cs.TotalInflow,
			TotalOutflow: cs.TotalOutflow,
		}
		if cs.CategoryUUID != nil {
			summary.CategoryUuid = &models.CategoryUUID{UUID: common.MustUUIDFromString(*cs.CategoryUUID)}
		}

		summaries = append(summaries, summary)
	}

	base := toAPILedgerPeriod(period.LedgerPeriod)

	return LedgerPeriodDetail{
		Uuid:              base.Uuid,
		Name:              base.Name,
		OpeningBalance:    base.OpeningBalance,
		ClosingBalance:    base.ClosingBalance,
		OpenDate:          base.OpenDate,
		CloseDate:         base.CloseDate,
		Status:            base.Status,
		ReopenReason:      base.ReopenReason,
		ReopenedAt:        base.ReopenedAt,
		ReconciledAt:      base.ReconciledAt,
		ReportUuid:        base.ReportUuid,
		TotalInflow:       period.TotalInflow,
		TotalOutflow:      period.TotalOutflow,
		EntryCount:        period.EntryCount,
		Statements:        statements,
		CategorySummaries: summaries,
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
	orgID, err := orgIDFromRequest(ctx)
	if err != nil {
		return nil, err
	}

	fundSources, err := h.queryHandlers.ListFundSources(ctx, queries.ListFundSources{OrgID: orgID})
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

func (h *Handlers) ListCategories(ctx context.Context, request ListCategoriesRequestObject) (ListCategoriesResponseObject, error) {
	orgID, err := orgIDFromRequest(ctx)
	if err != nil {
		return nil, err
	}

	categories, err := h.queryHandlers.ListCategories(ctx, queries.ListCategories{OrgID: orgID})
	if err != nil {
		return nil, err
	}

	items := make([]Category, 0, len(categories))
	for _, c := range categories {
		subs := make([]SubCategory, 0, len(c.SubCategories))
		for _, s := range c.SubCategories {
			subs = append(subs, SubCategory{
				Uuid:        models.CategoryUUID{UUID: common.MustUUIDFromString(s.UUID)},
				Name:        s.Name,
				Description: s.Description,
			})
		}

		items = append(items, Category{
			Uuid:          models.CategoryUUID{UUID: common.MustUUIDFromString(c.UUID)},
			Name:          c.Name,
			Description:   c.Description,
			SubCategories: subs,
		})
	}

	return ListCategories200JSONResponse{Items: items}, nil
}

func (h *Handlers) UpsertCategories(ctx context.Context, request UpsertCategoriesRequestObject) (UpsertCategoriesResponseObject, error) {
	orgID, err := orgIDFromRequest(ctx)
	if err != nil {
		return nil, err
	}

	if request.Body == nil {
		return nil, common.NewInvalidInputError("body-required", "request body is required")
	}

	inputs := make([]commands.CategoryInput, 0, len(request.Body.Categories))
	for _, c := range request.Body.Categories {
		var subs []commands.SubCategoryInput
		if c.SubCategories != nil {
			for _, s := range *c.SubCategories {
				subs = append(subs, commands.SubCategoryInput{UUID: s.Uuid, Name: s.Name, Description: s.Description})
			}
		}

		inputs = append(inputs, commands.CategoryInput{
			UUID:          c.Uuid,
			Name:          c.Name,
			Description:   c.Description,
			SubCategories: subs,
		})
	}

	uuids, err := h.commandHandlers.UpsertCategory(ctx, commands.UpsertCategory{
		OrgID:      orgID,
		Categories: inputs,
	})
	if err != nil {
		return nil, err
	}

	return UpsertCategories200JSONResponse{CategoryUuids: uuids}, nil
}
