package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	common "github.com/quangbach27/golang-common"
	commonDb "github.com/quangbach27/golang-common/db"

	"backend/internal/ledgers/adapters/db/dbmodels"
	"backend/internal/ledgers/domain"
)

var errNotImplemented = errors.New("not implemented")

type LedgerPeriodRepo struct {
	db *pgxpool.Pool
}

var _ domain.LedgerPeriodRepository = (*LedgerPeriodRepo)(nil)

func NewLedgerPeriodRepository(db *pgxpool.Pool) (*LedgerPeriodRepo, error) {
	if db == nil {
		return nil, errors.New("db can't be nil")
	}

	return &LedgerPeriodRepo{db: db}, nil
}

func (r *LedgerPeriodRepo) OpenLedgerPeriod(
	ctx context.Context,
	fundSourceUUIDs []domain.FundSourceUUID,
	createFn func(fundSources []*domain.FundSource) (*domain.LedgerPeriod, error),
) error {
	if err := validateFundSourceUUIDs(fundSourceUUIDs); err != nil {
		return err
	}

	uuids := make([]common.UUID, 0, len(fundSourceUUIDs))
	for _, id := range fundSourceUUIDs {
		uuids = append(uuids, id.UUID)
	}

	err := commonDb.UpdateInSerializableTx(ctx, r.db, func(ctx context.Context, tx pgx.Tx) error {
		q := dbmodels.New(tx)

		unlocked, err := q.ExistsUnlockedLedgerPeriod(ctx)
		if err != nil {
			return err
		}
		if unlocked {
			return common.NewConflictError("unlocked-period-exists", "an unlocked ledger period already exists")
		}

		rows, err := q.ListFundSourcesByUUIDs(ctx, uuids)
		if err != nil {
			return err
		}
		if len(rows) != len(uuids) {
			return common.NewNotFoundError("fund-source-not-found", "one or more fund sources were not found")
		}

		fundSources := make([]*domain.FundSource, 0, len(rows))
		for _, row := range rows {
			fs, err := fundSourceToDomain(row)
			if err != nil {
				return err
			}

			fundSources = append(fundSources, fs)
		}

		period, err := createFn(fundSources)
		if err != nil {
			return err
		}
		if period == nil {
			return errors.New("createFn returned a nil ledger period")
		}

		statements := make([]*domain.FundSourceStatement, 0, len(fundSources))
		for _, fs := range fundSources {
			pfs, err := domain.NewFundSourceStatement(period.UUID(), fs.UUID(), fs.Balance())
			if err != nil {
				return err
			}

			statements = append(statements, pfs)
		}

		if err := q.CreateLedgerPeriod(ctx, ledgerPeriodToCreateParams(period)); err != nil {
			return err
		}
		for _, pfs := range statements {
			if err := q.CreateFundSourceStatement(ctx, fundSourceStatementToCreateParams(pfs)); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		var cerr common.Error
		if errors.As(err, &cerr) {
			return err
		}

		return fmt.Errorf("open ledger period: %w", err)
	}

	return nil
}

func validateFundSourceUUIDs(uuids []domain.FundSourceUUID) error {
	if len(uuids) == 0 {
		return common.NewInvalidInputError("fund-sources-required", "at least one fund source is required")
	}

	seen := make(map[domain.FundSourceUUID]struct{}, len(uuids))
	for _, id := range uuids {
		if id.IsZero() {
			return common.NewInvalidInputError("fund-source-required", "fund source is required")
		}
		if _, dup := seen[id]; dup {
			return common.NewInvalidInputError("duplicate-fund-source", "duplicate fund source id %s", id.String())
		}

		seen[id] = struct{}{}
	}

	return nil
}

// TODO: lock the period row (FOR UPDATE), call Close, save.
func (r *LedgerPeriodRepo) CloseLedgerPeriod(
	ctx context.Context,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
) error {
	return errNotImplemented
}

// TODO: lock the period row (FOR UPDATE), call updateFn, save.
func (r *LedgerPeriodRepo) ReopenLedgerPeriod(
	ctx context.Context,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
	updateFn func(period *domain.LedgerPeriod) error,
) error {
	return errNotImplemented
}

// TODO: lock the period row (FOR UPDATE), call updateFn, save.
func (r *LedgerPeriodRepo) ReconcileLedgerPeriod(
	ctx context.Context,
	ledgerPeriodUUID domain.LedgerPeriodUUID,
	updateFn func(period *domain.LedgerPeriod) error,
) error {
	return errNotImplemented
}
