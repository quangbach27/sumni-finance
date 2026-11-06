//go:build component

package ledgers_test

import (
	"context"
	"testing"
	"time"

	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
	ledgersClients "backend/internal/ledgers/ports/http/clients"
	apputils "backend/internal/utils"
	"backend/tests/utils"
)

// Period tests are intentionally not parallel: only one unlocked period can exist at a time,
// so each test resets the period tables first. Serial tests never overlap each other or the
// parallel fund source tests (those pause until the serial ones finish).

func TestOpenLedgerPeriod(t *testing.T) {
	t.Run("opens a period with the summed opening balance", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs1 := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		_, fs2 := createFundSource(t, clients, token, domain.FundSourceTypeBank)

		body := novemberPeriodRequest(time.November, fs1, fs2)
		resp := openLedgerPeriod(t, clients, token, body)
		require.Equal(t, 201, resp.StatusCode(), "body: %s", string(resp.Body))
		require.NotNil(t, resp.JSON201)
		assert.False(t, resp.JSON201.LedgerPeriodUuid.IsZero())

		page := listLedgerPeriods(t, clients, token, nil)
		require.Len(t, page.Items, 1)
		got := page.Items[0]
		assert.Equal(t, resp.JSON201.LedgerPeriodUuid.String(), got.Uuid.String())
		assert.Equal(t, body.Name, got.Name)
		assert.True(t, got.OpeningBalance.Equal(decimal.NewFromInt(2_000_000)), "got %s", got.OpeningBalance)
		assert.Nil(t, got.ClosingBalance)
		assert.True(t, got.Status.Equal(domain.LedgerStatusOpened.Enum))
		assert.True(t, got.OpenDate.Equal(body.OpenDate))
		assert.True(t, got.CloseDate.Equal(body.CloseDate))
	})

	t.Run("conflicts while an unlocked period exists", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)

		first := openLedgerPeriod(t, clients, token, novemberPeriodRequest(time.October, fs))
		require.Equal(t, 201, first.StatusCode(), "body: %s", string(first.Body))

		second := openLedgerPeriod(t, clients, token, novemberPeriodRequest(time.November, fs))
		require.Equal(t, 409, second.StatusCode(), "body: %s", string(second.Body))
		require.NotNil(t, second.JSON409)
		assert.Equal(t, "unlocked-period-exists", second.JSON409.Slug)
	})

	t.Run("opens a new period once the previous one is reconciled", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)

		first := openLedgerPeriod(t, clients, token, novemberPeriodRequest(time.October, fs))
		require.Equal(t, 201, first.StatusCode(), "body: %s", string(first.Body))
		markPeriodReconciled(t, first.JSON201.LedgerPeriodUuid)

		second := openLedgerPeriod(t, clients, token, novemberPeriodRequest(time.November, fs))
		require.Equal(t, 201, second.StatusCode(), "body: %s", string(second.Body))
	})

	t.Run("rejects invalid input", func(t *testing.T) {
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)

		badDates := novemberPeriodRequest(time.November, fs)
		badDates.Name = " "
		badDates.CloseDate = badDates.OpenDate.Add(-time.Hour)

		emptyName := novemberPeriodRequest(time.November, fs)
		emptyName.Name = " "

		closeBeforeOpen := novemberPeriodRequest(time.November, fs)
		closeBeforeOpen.CloseDate = closeBeforeOpen.OpenDate.Add(-time.Hour)

		noDates := novemberPeriodRequest(time.November, fs)
		noDates.OpenDate, noDates.CloseDate = time.Time{}, time.Time{}

		tests := []struct {
			name      string
			body      ledgersClients.OpenLedgerPeriodRequest
			wantSlug  string
			wantCodes []string
		}{
			{
				name:      "empty name and close before open",
				body:      badDates,
				wantSlug:  "invalid-ledger-period",
				wantCodes: []string{"name-required", "close-date-before-open-date"},
			},
			{
				name:      "empty name only",
				body:      emptyName,
				wantSlug:  "invalid-ledger-period",
				wantCodes: []string{"name-required"},
			},
			{
				name:      "close before open only",
				body:      closeBeforeOpen,
				wantSlug:  "invalid-ledger-period",
				wantCodes: []string{"close-date-before-open-date"},
			},
			{
				name:      "missing dates",
				body:      noDates,
				wantSlug:  "invalid-ledger-period",
				wantCodes: []string{"open-date-required", "close-date-required"},
			},
			{
				name:     "no fund sources",
				body:     novemberPeriodRequest(time.November),
				wantSlug: "fund-sources-required",
			},
			{
				name:     "duplicate fund source",
				body:     novemberPeriodRequest(time.November, fs, fs),
				wantSlug: "duplicate-fund-source",
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				utils.ResetLedgerPeriods(t)

				resp := openLedgerPeriod(t, clients, token, tt.body)
				require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
				require.NotNil(t, resp.JSON400)
				assert.Equal(t, tt.wantSlug, resp.JSON400.Slug)
				if tt.wantCodes != nil {
					assert.ElementsMatch(t, tt.wantCodes, errorSlugs(resp.JSON400))
				}
			})
		}
	})

	t.Run("returns 404 for an unknown fund source", func(t *testing.T) {
		utils.ResetLedgerPeriods(t)
		clients, token := utils.NewTestClients(t), newUserToken()
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)
		unknown := domain.FundSourceUUID{UUID: common.NewUUIDv7()}

		resp := openLedgerPeriod(t, clients, token, novemberPeriodRequest(time.November, fs, unknown))
		require.Equal(t, 404, resp.StatusCode(), "body: %s", string(resp.Body))
		require.NotNil(t, resp.JSON404)
		assert.Equal(t, "fund-source-not-found", resp.JSON404.Slug)
	})

	t.Run("rejects an unauthenticated request", func(t *testing.T) {
		resp, err := utils.NewTestClients(t).Ledgers.OpenLedgerPeriodWithResponse(
			context.Background(),
			novemberPeriodRequest(time.November, domain.FundSourceUUID{UUID: common.NewUUIDv7()}),
		)
		require.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode(), "body: %s", string(resp.Body))
	})
}

func TestListLedgerPeriods(t *testing.T) {
	// openThree opens Sep, Oct and Nov periods in turn, reconciling Sep and Oct, so Nov stays opened.
	openThree := func(t *testing.T, clients *utils.TestClients, token string) {
		t.Helper()
		utils.ResetLedgerPeriods(t)
		_, fs := createFundSource(t, clients, token, domain.FundSourceTypeCash)

		for _, month := range []time.Month{time.September, time.October, time.November} {
			resp := openLedgerPeriod(t, clients, token, novemberPeriodRequest(month, fs))
			require.Equal(t, 201, resp.StatusCode(), "body: %s", string(resp.Body))
			if month != time.November {
				markPeriodReconciled(t, resp.JSON201.LedgerPeriodUuid)
			}
		}
	}

	names := func(items []ledgersClients.LedgerPeriod) []string {
		out := make([]string, 0, len(items))
		for _, it := range items {
			out = append(out, it.Name)
		}

		return out
	}

	t.Run("returns newest first with page info", func(t *testing.T) {
		clients, token := utils.NewTestClients(t), newUserToken()
		openThree(t, clients, token)

		page := listLedgerPeriods(t, clients, token, nil)
		assert.Equal(t, []string{"period-2026-11", "period-2026-10", "period-2026-09"}, names(page.Items))
		assert.Equal(t, ledgersClients.PageInfo{Page: 1, PageSize: 20, TotalCount: 3}, page.PageInfo)
	})

	t.Run("paginates", func(t *testing.T) {
		clients, token := utils.NewTestClients(t), newUserToken()
		openThree(t, clients, token)

		first := listLedgerPeriods(t, clients, token, &ledgersClients.ListLedgerPeriodsParams{
			Page: apputils.Ptr(1), PageSize: apputils.Ptr(2),
		})
		assert.Equal(t, []string{"period-2026-11", "period-2026-10"}, names(first.Items))
		assert.Equal(t, ledgersClients.PageInfo{Page: 1, PageSize: 2, TotalCount: 3}, first.PageInfo)

		second := listLedgerPeriods(t, clients, token, &ledgersClients.ListLedgerPeriodsParams{
			Page: apputils.Ptr(2), PageSize: apputils.Ptr(2),
		})
		assert.Equal(t, []string{"period-2026-09"}, names(second.Items))
		assert.Equal(t, ledgersClients.PageInfo{Page: 2, PageSize: 2, TotalCount: 3}, second.PageInfo)

		beyond := listLedgerPeriods(t, clients, token, &ledgersClients.ListLedgerPeriodsParams{
			Page: apputils.Ptr(3), PageSize: apputils.Ptr(2),
		})
		assert.Empty(t, beyond.Items)
		assert.Equal(t, 3, beyond.PageInfo.TotalCount)
	})

	t.Run("filters by status", func(t *testing.T) {
		clients, token := utils.NewTestClients(t), newUserToken()
		openThree(t, clients, token)

		opened := domain.LedgerStatusOpened
		page := listLedgerPeriods(t, clients, token, &ledgersClients.ListLedgerPeriodsParams{Status: &opened})
		assert.Equal(t, []string{"period-2026-11"}, names(page.Items))
		assert.Equal(t, 1, page.PageInfo.TotalCount)

		reconciled := domain.LedgerStatusReconciled
		page = listLedgerPeriods(t, clients, token, &ledgersClients.ListLedgerPeriodsParams{Status: &reconciled})
		assert.Equal(t, []string{"period-2026-10", "period-2026-09"}, names(page.Items))
		assert.Equal(t, 2, page.PageInfo.TotalCount)
		require.NotNil(t, page.Items[0].ClosingBalance)
	})

	t.Run("rejects invalid pagination", func(t *testing.T) {
		clients, token := utils.NewTestClients(t), newUserToken()

		for name, params := range map[string]ledgersClients.ListLedgerPeriodsParams{
			"page below 1":      {Page: apputils.Ptr(-1)},
			"page size too big": {PageSize: apputils.Ptr(101)},
		} {
			t.Run(name, func(t *testing.T) {
				resp, err := clients.Ledgers.ListLedgerPeriodsWithResponse(context.Background(), &params, utils.AuthEditorFn(token))
				require.NoError(t, err)
				require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
				require.NotNil(t, resp.JSON400)
				assert.Equal(t, "invalid-pagination", resp.JSON400.Slug)
			})
		}
	})

	t.Run("rejects an unauthenticated request", func(t *testing.T) {
		resp, err := utils.NewTestClients(t).Ledgers.ListLedgerPeriodsWithResponse(context.Background(), nil)
		require.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode(), "body: %s", string(resp.Body))
	})
}
