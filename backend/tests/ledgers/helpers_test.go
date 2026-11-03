//go:build component

package ledgers_test

import (
	"context"
	"testing"

	"github.com/google/go-cmp/cmp"
	common "github.com/quangbach27/golang-common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
	ledgersClients "backend/internal/ledgers/ports/http/clients"
	"backend/internal/shared"
	"backend/tests/utils"
)

func ptr[T any](v T) *T { return &v }

// newUserToken registers a session for a fresh user and returns its bearer token.
func newUserToken() string {
	return utils.NewSession("user-" + common.NewUUIDv7().String())
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
		Currency:     common.MustEnum[shared.Currency]("VND"),
	}

	switch fsType {
	case domain.FundSourceTypeBank:
		body.Details = ledgersClients.FundSourceDetails{
			OwnerName:     "An",
			BankCode:      ptr("VCB"),
			BankBin:       ptr(int32(970436)),
			BankShortName: ptr("Vietcombank"),
			AccountNumber: ptr("123456789"),
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
