//go:build component

package ledgers_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
	ledgersClients "backend/internal/ledgers/ports/http/clients"
	"backend/internal/shared"
	apputils "backend/internal/utils"
	"backend/tests/utils"
)

// newUserToken registers a session for a fresh user in a fresh org and returns its bearer
// token. Ledgers data is scoped by org, so each test that uses it starts from an empty org.
func newUserToken() string {
	return newOrgUserToken("org-" + common.NewUUIDv7().String())
}

// newOrgUserToken registers an office-admin session for a fresh user in the given org and
// returns its bearer token.
func newOrgUserToken(orgID string) string {
	return newOrgRoleToken(orgID, shared.RoleOfficeAdmin)
}

// newOrgRoleToken registers a session with the given role for a fresh user in the given org
// and returns its bearer token.
func newOrgRoleToken(orgID string, role shared.Role) string {
	return utils.NewOrgSession("user-"+common.NewUUIDv7().String(), orgID, role.String())
}

// createFundSource creates a valid fund source of the given type (bank or cash) as the user
// owning token, requires a 201, and returns the request it sent and the new fund source UUID.
func createFundSource(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	fsType domain.FundSourceType,
) (ledgersClients.CreateFundSourceRequest, domain.FundSourceUUID) {
	t.Helper()

	body := ledgersClients.CreateFundSourceRequest{
		Name:         "fund-source-" + common.NewUUIDv7().String(),
		Type:         fsType,
		StartBalance: decimal.NewFromInt(1_000_000),
		Currency:     shared.CurrencyVND,
	}

	switch fsType {
	case domain.FundSourceTypeBank:
		body.Details = ledgersClients.FundSourceDetails{
			OwnerName:     "An",
			BankCode:      apputils.Ptr("VCB"),
			BankBin:       apputils.Ptr(int32(970436)),
			BankShortName: apputils.Ptr("Vietcombank"),
			AccountNumber: apputils.Ptr("123456789"),
		}
	case domain.FundSourceTypeCash:
		body.Details = ledgersClients.FundSourceDetails{OwnerName: "An"}
	default:
		t.Fatalf("unsupported fund source type %q", fsType.String())
	}

	resp, err := clients.Ledgers.CreateFundSourceWithResponse(context.Background(), body, utils.AuthEditorFn(token))
	require.NoError(t, err)
	require.Equal(t, 201, resp.StatusCode(), "body: %s", string(resp.Body))
	require.NotNil(t, resp.JSON201)

	return body, resp.JSON201.FundSourceUuid
}

// errorSlugs returns the error_slug of every detail in an error response.
func errorSlugs(resp *ledgersClients.ErrorResponse) []string {
	if resp == nil || resp.Details == nil {
		return nil
	}

	slugs := make([]string, 0, len(*resp.Details))
	for _, d := range *resp.Details {
		slugs = append(slugs, d.ErrorSlug)
	}

	return slugs
}

// listFundSources lists fund sources as the user owning token and requires a 200.
func listFundSources(t *testing.T, clients *utils.TestClients, token string) []ledgersClients.FundSource {
	t.Helper()

	resp, err := clients.Ledgers.ListFundSourcesWithResponse(context.Background(), utils.AuthEditorFn(token))
	require.NoError(t, err)
	require.Equal(t, 200, resp.StatusCode(), "body: %s", string(resp.Body))
	require.NotNil(t, resp.JSON200)

	return resp.JSON200.FundSources
}

// requireFundSourceMatches lists fund sources, finds the one with id and requires it to equal
// the fund source described by the create request.
func requireFundSourceMatches(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	fsUUID domain.FundSourceUUID,
	reqBody ledgersClients.CreateFundSourceRequest,
) {
	t.Helper()

	want := ledgersClients.FundSource{
		Uuid:     fsUUID,
		Name:     reqBody.Name,
		Type:     reqBody.Type,
		Balance:  reqBody.StartBalance,
		Currency: reqBody.Currency,
		Details:  reqBody.Details,
	}

	var got ledgersClients.FundSource
	for _, fs := range listFundSources(t, clients, token) {
		if fs.Uuid.String() == fsUUID.String() {
			got = fs
			break
		}
	}
	require.NotNil(t, got, "fund source %s not listed", fsUUID.String())

	diff := cmp.Diff(want, got)

	require.Empty(t, diff)
}

// openLedgerPeriod opens a period as the user owning token and returns the raw response.
func openLedgerPeriod(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	body ledgersClients.OpenLedgerPeriodRequest,
) *ledgersClients.OpenLedgerPeriodClientResponse {
	t.Helper()

	resp, err := clients.Ledgers.OpenLedgerPeriodWithResponse(context.Background(), body, utils.AuthEditorFn(token))
	require.NoError(t, err)

	return resp
}

// novemberPeriodRequest is a valid request opening a November 2026 style period (month = 1..12).
func novemberPeriodRequest(month time.Month, fundSourceUUIDs ...domain.FundSourceUUID) ledgersClients.OpenLedgerPeriodRequest {
	open := time.Date(2026, month, 1, 0, 0, 0, 0, time.UTC)

	return ledgersClients.OpenLedgerPeriodRequest{
		Name:            "period-" + open.Format("2006-01"),
		OpenDate:        open,
		CloseDate:       open.AddDate(0, 1, -1),
		FundSourceUuids: fundSourceUUIDs,
	}
}

// listLedgerPeriods lists periods as the user owning token and requires a 200.
func listLedgerPeriods(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	params *ledgersClients.ListLedgerPeriodsParams,
) *ledgersClients.ListLedgerPeriodsResponse {
	t.Helper()

	resp, err := clients.Ledgers.ListLedgerPeriodsWithResponse(context.Background(), params, utils.AuthEditorFn(token))
	require.NoError(t, err)
	require.Equal(t, 200, resp.StatusCode(), "body: %s", string(resp.Body))
	require.NotNil(t, resp.JSON200)

	return resp.JSON200
}

// markPeriodReconciled locks a period directly in the DB (no HTTP endpoint reconciles yet).
func markPeriodReconciled(t *testing.T, periodUUID domain.LedgerPeriodUUID) {
	t.Helper()

	_, err := utils.DB.Exec(context.Background(),
		"UPDATE ledgers.ledger_periods SET status = 'reconciled', closing_balance = opening_balance, reconciled_at = now() WHERE uuid = $1",
		periodUUID,
	)
	require.NoError(t, err)
}
