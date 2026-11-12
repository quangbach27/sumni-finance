package utils

import (
	"context"
	"net/http"
	"testing"
	"time"

	commonHTTP "github.com/quangbach27/golang-common/http"
	"github.com/quangbach27/golang-common/log"
	"github.com/stretchr/testify/require"

	authzClients "backend/internal/authorization/ports/http/clients"
	ledgersClients "backend/internal/ledgers/ports/http/clients"
)

type TestClients struct {
	Ledgers       *ledgersClients.ClientWithResponses
	Authorization *authzClients.ClientWithResponses
}

func NewTestClients(t *testing.T) *TestClients {
	t.Helper()

	httpClient := &http.Client{Timeout: 10 * time.Second}
	editorFn := func(ctx context.Context, req *http.Request) error {
		log.FromContext(ctx).
			With(
				"method", req.Method,
				"url", req.URL.String(),
				"test_name", t.Name(),
			).
			Info("Making component test API request")
		req.Header.Set(commonHTTP.TestNameHeader, t.Name())
		return nil
	}

	ledgers, err := ledgersClients.NewClientWithResponses(BaseURL, ledgersClients.WithHTTPClient(httpClient), ledgersClients.WithRequestEditorFn(editorFn))
	require.NoError(t, err)

	authorization, err := authzClients.NewClientWithResponses(BaseURL, authzClients.WithHTTPClient(httpClient), authzClients.WithRequestEditorFn(editorFn))
	require.NoError(t, err)

	return &TestClients{
		Ledgers:       ledgers,
		Authorization: authorization,
	}
}
