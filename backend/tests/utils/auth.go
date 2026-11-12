package utils

import (
	"context"
	"net/http"

	common "github.com/quangbach27/golang-common"
	"github.com/quangbach27/golang-common/http/auth"
)

func Username(userID string) string {
	return "name-" + userID
}

// NewSession registers a bearer token that authenticates as userID (with username Username(userID))
// and the given role (only the first of roles is used), and returns the token.
func NewSession(userID string, roles ...string) string {
	token := common.NewUUIDv7().String()

	var role string
	if len(roles) > 0 {
		role = roles[0]
	}

	verifier.Add(token, &auth.Session{
		Subject: userID,
		Role:    role,
		Extra:   map[string]any{"username": Username(userID)},
	})

	return token
}

// NewOrgSession registers a bearer token for userID acting in orgID with the given role
// (the identity provider contract used by the authorization module), and returns the token.
func NewOrgSession(userID, orgID, role string) string {
	token := common.NewUUIDv7().String()

	verifier.Add(token, &auth.Session{
		Subject: userID,
		Role:    role,
		Extra: map[string]any{
			"username":     Username(userID),
			"organization": orgID,
		},
	})

	return token
}

func AuthEditorFn(token string) func(ctx context.Context, req *http.Request) error {
	return func(_ context.Context, req *http.Request) error {
		req.Header.Set("Authorization", "Bearer "+token)
		return nil
	}
}
