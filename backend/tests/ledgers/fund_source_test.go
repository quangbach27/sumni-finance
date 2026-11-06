//go:build component

package ledgers_test

import (
	"context"
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
	ledgersClients "backend/internal/ledgers/ports/http/clients"
	"backend/internal/shared"
	"backend/tests/utils"
)

func TestCreateFundSource(t *testing.T) {
	t.Parallel()

	t.Run("creates a bank fund source", func(t *testing.T) {
		t.Parallel()

		clients, token := utils.NewTestClients(t), newUserToken()
		req, id := createFundSource(t, clients, token, domain.FundSourceTypeBank)
		assert.False(t, id.IsZero())
		requireFundSourceMatches(t, clients, token, id, req)
	})

	t.Run("creates a cash fund source", func(t *testing.T) {
		t.Parallel()

		testClients, token := utils.NewTestClients(t), newUserToken()
		req, id := createFundSource(t, testClients, token, domain.FundSourceTypeCash)
		assert.False(t, id.IsZero())
		requireFundSourceMatches(t, testClients, token, id, req)
	})

	t.Run("rejects an unauthenticated request", func(t *testing.T) {
		t.Parallel()

		resp, err := utils.NewTestClients(t).Ledgers.CreateFundSourceWithResponse(
			context.Background(),
			ledgersClients.CreateFundSourceRequest{
				Name:         "unauthenticated",
				Type:         domain.FundSourceTypeCash,
				StartBalance: decimal.Zero,
				Currency:     shared.CurrencyVND,
				Details:      ledgersClients.FundSourceDetails{OwnerName: "An"},
			},
		)
		require.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode(), "body: %s", string(resp.Body))
	})
}

func TestCreateFundSource_Validation(t *testing.T) {
	t.Parallel()

	vnd := shared.CurrencyVND

	tests := []struct {
		name      string
		body      ledgersClients.CreateFundSourceRequest
		wantSlug  string
		wantCodes []string
	}{
		{
			name: "multiple errors at once",
			body: ledgersClients.CreateFundSourceRequest{
				Name:         "",
				Type:         domain.FundSourceTypeCash,
				StartBalance: decimal.NewFromInt(-1),
				Currency:     vnd,
				Details:      ledgersClients.FundSourceDetails{OwnerName: "An"},
			},
			wantSlug:  "invalid-fund-source",
			wantCodes: []string{"name-required", "start-balance-negative"},
		},
		{
			name: "nil bank details",
			body: ledgersClients.CreateFundSourceRequest{
				Name:         "nil bank details",
				Type:         domain.FundSourceTypeBank,
				StartBalance: decimal.NewFromInt(1_000),
				Currency:     vnd,
				Details:      ledgersClients.FundSourceDetails{},
			},
			wantSlug: "invalid-bank-details",
			wantCodes: []string{
				"bank-code-required",
				"bank-bin-required",
				"bank-short-name-required",
				"account-number-required",
				"owner-name-required",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp, err := utils.NewTestClients(t).Ledgers.CreateFundSourceWithResponse(
				context.Background(), tt.body, utils.AuthEditorFn(newUserToken()),
			)
			require.NoError(t, err)
			require.Equal(t, 400, resp.StatusCode(), "body: %s", string(resp.Body))
			require.NotNil(t, resp.JSON400)

			assert.Equal(t, tt.wantSlug, resp.JSON400.Slug)
			assert.ElementsMatch(t, tt.wantCodes, errorSlugs(resp.JSON400))
		})
	}
}

func TestListFundSources(t *testing.T) {
	t.Parallel()

	t.Run("lists created bank and cash fund sources", func(t *testing.T) {
		t.Parallel()

		clients := utils.NewTestClients(t)
		token := newUserToken()

		bankReq, bankID := createFundSource(t, clients, token, domain.FundSourceTypeBank)
		cashReq, cashID := createFundSource(t, clients, token, domain.FundSourceTypeCash)

		requireFundSourceMatches(t, clients, token, bankID, bankReq)
		requireFundSourceMatches(t, clients, token, cashID, cashReq)
	})

	t.Run("rejects an unauthenticated request", func(t *testing.T) {
		t.Parallel()

		resp, err := utils.NewTestClients(t).Ledgers.ListFundSourcesWithResponse(context.Background())
		require.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode(), "body: %s", string(resp.Body))
	})
}
