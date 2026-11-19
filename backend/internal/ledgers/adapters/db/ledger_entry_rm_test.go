//go:build integration

package db_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/adapters/bankverifier"
	ledgerdb "backend/internal/ledgers/adapters/db"
	"backend/internal/ledgers/apps/queries"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

func TestLedgerEntryReadModel(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	// Own org so the single-unlocked-period rule and other tests don't interfere.
	orgID := "org_entry_rm_" + uuid.NewString()

	fsRepo, err := ledgerdb.NewFundSourceRepository(pgxDb)
	require.NoError(t, err)
	readModel, err := ledgerdb.NewLedgerEntryReadModel(pgxDb)
	require.NoError(t, err)
	factory, err := domain.NewFundSourceFactory(bankverifier.NewBankAccountVerifierStub())
	require.NoError(t, err)

	details, err := factory.CreateCashDetails("An")
	require.NoError(t, err)
	fs, err := factory.CreateFundSource("Cash (entry rm)", decimal.Zero, shared.CurrencyVND, details)
	require.NoError(t, err)
	require.NoError(t, fsRepo.CreateFundSource(ctx, orgID, fs))

	periodID, parentID, tagID := uuid.New(), uuid.New(), uuid.New()
	now := time.Now().UTC().Truncate(time.Second)

	exec := func(sql string, args ...any) {
		_, err := pgxDb.Exec(ctx, sql, args...)
		require.NoError(t, err)
	}

	exec(`INSERT INTO ledgers.ledger_periods (uuid, org_id, name, opening_balance, open_date, close_date, status)
		VALUES ($1, $2, 'Tháng 10/2026', 0, $3, $3, 'opened')`, periodID, orgID, now)
	exec(`INSERT INTO ledgers.categories (uuid, org_id, name) VALUES ($1, $2, 'Quỹ vận hành VP')`, parentID, orgID)
	exec(`INSERT INTO ledgers.categories (uuid, org_id, parent_uuid, name) VALUES ($1, $2, $3, 'Điện nước')`, tagID, orgID, parentID)

	insert := func(id uuid.UUID, direction string, amount, before, after int, categoryID any, occurredAt time.Time) {
		exec(`INSERT INTO ledgers.ledger_entries
			(uuid, org_id, ledger_period_uuid, fund_source_uuid, amount, direction, description, occurred_at, category_uuid,
			 fs_balance_before, fs_balance_after, status, kind, created_by)
			VALUES ($1, $10, $2, $3, $4, $5, 'entry', $6, $7, $8, $9, 'posted', 'normal', 'user_1')`,
			id, periodID, fs.UUID().UUID, amount, direction, occurredAt, categoryID, before, after, orgID)
	}

	normalID, voidedID, reversalID := uuid.New(), uuid.New(), uuid.New()
	insert(normalID, "inflow", 800, 0, 800, tagID, now.Add(-2*time.Hour))
	insert(voidedID, "outflow", 300, 800, 500, parentID, now.Add(-time.Hour))
	// reversal of the voided entry
	exec(`INSERT INTO ledgers.ledger_entries
		(uuid, org_id, ledger_period_uuid, fund_source_uuid, amount, direction, description, occurred_at, category_uuid,
		 fs_balance_before, fs_balance_after, status, kind, reverses_entry_uuid, created_by)
		VALUES ($1, $7, $2, $3, 300, 'inflow', 'reversal', $4, $5, 500, 800, 'posted', 'reversal', $6, 'user_2')`,
		reversalID, periodID, fs.UUID().UUID, now, parentID, voidedID, orgID)
	exec(`UPDATE ledgers.ledger_entries
		SET status = 'voided', reversed_by_entry_uuid = $1, voided_reason = 'typo', voided_by = 'user_1', voided_at = $2
		WHERE uuid = $3`, reversalID, now, voidedID)

	kindNormal := domain.EntryKindNormal
	sortNewest := queries.LedgerEntrySort{Field: queries.LedgerEntryOrderByOccurredAt, Desc: true}
	page, err := shared.NewPageRequest(1, 10)
	require.NoError(t, err)

	t.Run("kind filter excludes reversal entries", func(t *testing.T) {
		t.Parallel()

		got, err := readModel.ListLedgerEntries(ctx, orgID, queries.ListLedgerEntries{
			FundSourceUUID: &domain.FundSourceUUID{UUID: fs.UUID().UUID},
			Kind:           &kindNormal,
			Sort:           sortNewest,
			Page:           page,
		})
		require.NoError(t, err)

		assert.Equal(t, 2, got.Page.TotalCount)
		require.Len(t, got.Items, 2)
		// newest first: the voided entry, then the normal one
		assert.Equal(t, voidedID.String(), got.Items[0].UUID)
		assert.Equal(t, domain.EntryStatusVoided, got.Items[0].Status)
		require.NotNil(t, got.Items[0].ReversedByEntryUUID)
		assert.Equal(t, reversalID.String(), *got.Items[0].ReversedByEntryUUID)
		assert.True(t, got.Items[0].BalanceBefore.Equal(decimal.NewFromInt(800)))
		require.NotNil(t, got.Items[0].VoidedReason)
		assert.Equal(t, "typo", *got.Items[0].VoidedReason)
		assert.Equal(t, "Tháng 10/2026", got.Items[0].LedgerPeriod.Name)
		assert.Equal(t, "user_1", got.Items[0].CreatedBy)
	})

	t.Run("without kind both are listed", func(t *testing.T) {
		t.Parallel()

		got, err := readModel.ListLedgerEntries(ctx, orgID, queries.ListLedgerEntries{Sort: sortNewest, Page: page})
		require.NoError(t, err)
		assert.Equal(t, 3, got.Page.TotalCount)
	})

	t.Run("period and date filters", func(t *testing.T) {
		t.Parallel()

		period := domain.LedgerPeriodUUID{UUID: common.UUID(periodID)}
		got, err := readModel.ListLedgerEntries(ctx, orgID, queries.ListLedgerEntries{
			LedgerPeriodUUID: &period, Sort: sortNewest, Page: page,
		})
		require.NoError(t, err)
		assert.Equal(t, 3, got.Page.TotalCount)

		other := domain.LedgerPeriodUUID{UUID: common.UUID(uuid.New())}
		got, err = readModel.ListLedgerEntries(ctx, orgID, queries.ListLedgerEntries{
			LedgerPeriodUUID: &other, Sort: sortNewest, Page: page,
		})
		require.NoError(t, err)
		assert.Zero(t, got.Page.TotalCount)
		assert.Empty(t, got.Items)

		// only the entries at or after 90 minutes ago: the voided one and the reversal
		from := now.Add(-90 * time.Minute)
		got, err = readModel.ListLedgerEntries(ctx, orgID, queries.ListLedgerEntries{
			FromDate: &from, Sort: sortNewest, Page: page,
		})
		require.NoError(t, err)
		assert.Equal(t, 2, got.Page.TotalCount)

		to := now.Add(-90 * time.Minute)
		got, err = readModel.ListLedgerEntries(ctx, orgID, queries.ListLedgerEntries{
			ToDate: &to, Sort: sortNewest, Page: page,
		})
		require.NoError(t, err)
		assert.Equal(t, 1, got.Page.TotalCount)
	})

	t.Run("tag resolves to parent category", func(t *testing.T) {
		t.Parallel()

		got, err := readModel.GetLedgerEntry(ctx, orgID, domain.LedgerEntryUUID{UUID: common.UUID(normalID)})
		require.NoError(t, err)
		require.NotNil(t, got.Category)
		require.NotNil(t, got.Tag)
		assert.Equal(t, "Quỹ vận hành VP", got.Category.Name)
		assert.Equal(t, "Điện nước", got.Tag.Name)
	})

	t.Run("get returns the reversal entry", func(t *testing.T) {
		t.Parallel()

		got, err := readModel.GetLedgerEntry(ctx, orgID, domain.LedgerEntryUUID{UUID: common.UUID(reversalID)})
		require.NoError(t, err)
		assert.Equal(t, domain.EntryKindReversal, got.Kind)
		assert.Equal(t, "user_2", got.CreatedBy)
		require.NotNil(t, got.ReversesEntryUUID)
		assert.Equal(t, voidedID.String(), *got.ReversesEntryUUID)
	})

	t.Run("other org sees nothing", func(t *testing.T) {
		t.Parallel()

		other := "org_other_" + uuid.NewString()
		fsUUID := domain.FundSourceUUID{UUID: fs.UUID().UUID}
		got, err := readModel.ListLedgerEntries(ctx, other, queries.ListLedgerEntries{
			FundSourceUUID: &fsUUID, Sort: sortNewest, Page: page,
		})
		require.NoError(t, err)
		assert.Zero(t, got.Page.TotalCount)
		assert.Empty(t, got.Items)
	})

	t.Run("other org cannot read the entry", func(t *testing.T) {
		t.Parallel()

		_, err := readModel.GetLedgerEntry(ctx, "org_other", domain.LedgerEntryUUID{UUID: common.UUID(normalID)})
		require.Error(t, err)
	})
}
