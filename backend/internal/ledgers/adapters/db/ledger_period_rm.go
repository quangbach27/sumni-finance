package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	common "github.com/quangbach27/golang-common"

	"backend/internal/ledgers/adapters/db/dbmodels"
	"backend/internal/ledgers/apps/queries"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

type LedgerPeriodReadModel struct {
	db *pgxpool.Pool
}

var _ queries.LedgerPeriodReadModel = (*LedgerPeriodReadModel)(nil)

func NewLedgerPeriodReadModel(db *pgxpool.Pool) (*LedgerPeriodReadModel, error) {
	if db == nil {
		return nil, errors.New("db can't be nil")
	}

	return &LedgerPeriodReadModel{db: db}, nil
}

func (r *LedgerPeriodReadModel) ListLedgerPeriods(
	ctx context.Context,
	query queries.ListLedgerPeriods,
) (shared.PagedResult[queries.LedgerPeriod], error) {
	var status *string
	if query.Status != nil {
		s := query.Status.String()
		status = &s
	}

	q := dbmodels.New(r.db)

	total, err := q.CountLedgerPeriods(ctx, status)
	if err != nil {
		return shared.PagedResult[queries.LedgerPeriod]{}, fmt.Errorf("count ledger periods: %w", err)
	}

	rows, err := q.ListLedgerPeriods(ctx, dbmodels.ListLedgerPeriodsParams{
		Status:     status,
		PageLimit:  int32(query.Page.Limit()),
		PageOffset: int32(query.Page.Offset()),
	})
	if err != nil {
		return shared.PagedResult[queries.LedgerPeriod]{}, fmt.Errorf("list ledger periods: %w", err)
	}

	items := make([]queries.LedgerPeriod, 0, len(rows))
	for _, row := range rows {
		items = append(items, queries.LedgerPeriod{
			UUID:           row.Uuid.String(),
			Name:           row.Name,
			OpeningBalance: row.OpeningBalance,
			ClosingBalance: row.ClosingBalance,
			OpenDate:       row.OpenDate,
			CloseDate:      row.CloseDate,
			Status:         row.Status.String(),
			ReopenReason:   row.ReopenReason,
			ReopenedAt:     row.ReopenedAt,
			ReconciledAt:   row.ReconciledAt,
			ReportUUID:     uuidPtrToString(row.ReportUuid),
		})
	}

	return shared.NewPagedResult(items, query.Page, int(total)), nil
}

func (r *LedgerPeriodReadModel) GetUnlockedLedgerPeriod(ctx context.Context) (queries.LedgerPeriodDetail, error) {
	periodUUID, err := dbmodels.New(r.db).GetUnlockedLedgerPeriodUUID(ctx)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return queries.LedgerPeriodDetail{}, common.NewNotFoundError("open-ledger-not-found", "no unlocked ledger period was found")
		}

		return queries.LedgerPeriodDetail{}, fmt.Errorf("get unlocked ledger period: %w", err)
	}

	return r.GetLedgerPeriod(ctx, periodUUID)
}

func (r *LedgerPeriodReadModel) GetLedgerPeriod(ctx context.Context, ledgerPeriodUUID domain.LedgerPeriodUUID) (queries.LedgerPeriodDetail, error) {
	rows, err := dbmodels.New(r.db).GetLedgerPeriodWithStatements(ctx, ledgerPeriodUUID)
	if err != nil {
		return queries.LedgerPeriodDetail{}, fmt.Errorf("get ledger period: %w", err)
	}

	if len(rows) == 0 {
		return queries.LedgerPeriodDetail{}, common.NewNotFoundError("ledger-period-not-found", "ledger period %s was not found", ledgerPeriodUUID.String())
	}

	// Period columns and totals repeat on every row, so the first row describes the period.
	first := rows[0]
	result := queries.LedgerPeriodDetail{
		LedgerPeriod: queries.LedgerPeriod{
			UUID:           first.Uuid.String(),
			Name:           first.Name,
			OpeningBalance: first.OpeningBalance,
			ClosingBalance: first.ClosingBalance,
			OpenDate:       first.OpenDate,
			CloseDate:      first.CloseDate,
			Status:         first.Status,
			ReopenReason:   first.ReopenReason,
			ReopenedAt:     first.ReopenedAt,
			ReconciledAt:   first.ReconciledAt,
			ReportUUID:     uuidPtrToString(first.ReportUuid),
		},
		TotalInflow:  first.TotalInflow,
		TotalOutflow: first.TotalOutflow,
		EntryCount:   first.EntryCount,
		Statements:   make([]queries.LedgerStatementDetail, 0, len(rows)),
	}

	for _, row := range rows {
		// The LEFT JOIN yields one all-empty statement row for a period without statements.
		if row.StatementUuid == "" {
			continue
		}

		st := queries.LedgerStatementDetail{
			FundSourceStatement: queries.FundSourceStatement{
				UUID:           row.StatementUuid,
				FundSourceUUID: row.FundSourceUuid,
				ClosingBalance: row.StatementClosingBalance,
				ActualBalance:  row.ActualBalance,
				ReconciledBy:   row.ReconciledBy,
				ReconciledAt:   row.StatementReconciledAt,
			},
		}
		if row.StatementOpeningBalance != nil {
			st.OpeningBalance = *row.StatementOpeningBalance
		}
		st.FundSource = statementFundSource(row)

		result.Statements = append(result.Statements, st)
	}

	return result, nil
}

func statementFundSource(row dbmodels.GetLedgerPeriodWithStatementsRow) queries.FundSource {
	fs := queries.FundSource{
		UUID:    row.FundSourceUuid,
		Type:    row.FundSourceType.String(),
		Details: queries.FundSourceDetails{},
	}
	if row.FundSourceName != nil {
		fs.Name = *row.FundSourceName
	}
	if row.FundSourceBalance != nil {
		fs.Balance = *row.FundSourceBalance
	}
	if row.FundSourceCurrency != nil {
		fs.Currency = *row.FundSourceCurrency
	}
	if row.FundSourceOwnerName != nil {
		fs.Details.OwnerName = *row.FundSourceOwnerName
	}

	if row.FundSourceBankCode != nil && row.FundSourceBankBin != nil && row.FundSourceBankShortName != nil && row.FundSourceAccountNumber != nil {
		fs.Details.Bank = &queries.BankDetails{
			BankCode:      *row.FundSourceBankCode,
			BankBin:       *row.FundSourceBankBin,
			BankShortName: *row.FundSourceBankShortName,
			AccountNumber: *row.FundSourceAccountNumber,
		}
	}

	return fs
}

func uuidPtrToString[T fmt.Stringer](id *T) *string {
	if id == nil {
		return nil
	}

	s := (*id).String()

	return &s
}
