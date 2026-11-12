package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"strings"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	commonAuth "github.com/quangbach27/golang-common/http/auth"
)

const clerkOrgRolePrefix = "org:"

// ClerkVerifier verifies Clerk session JWTs and maps them to a session.
type ClerkVerifier struct {
	authorizedParties []string
}

var _ commonAuth.TokenVerifier = (*ClerkVerifier)(nil)

func NewClerkVerifier(secretKey string, authorizedParties []string) (*ClerkVerifier, error) {
	if secretKey == "" {
		return nil, errors.New("clerk secret key is required")
	}

	clerk.SetKey(secretKey)

	return &ClerkVerifier{authorizedParties: authorizedParties}, nil
}

func (v *ClerkVerifier) Verify(ctx context.Context, token string) (*commonAuth.Session, error) {
	claims, err := jwt.Verify(ctx, &jwt.VerifyParams{
		Token:                  token,
		AuthorizedPartyHandler: v.isAuthorizedParty,
	})
	if err != nil {
		return nil, fmt.Errorf("%w: %w", commonAuth.ErrInvalidToken, err)
	}

	return sessionFromClaims(claims), nil
}

// isAuthorizedParty checks the azp claim; an empty allow-list skips the check.
func (v *ClerkVerifier) isAuthorizedParty(azp string) bool {
	return len(v.authorizedParties) == 0 || slices.Contains(v.authorizedParties, azp)
}

func sessionFromClaims(claims *clerk.SessionClaims) *commonAuth.Session {
	session := &commonAuth.Session{
		Subject:   claims.Subject,
		SessionID: claims.SessionID,
		Role:      strings.TrimPrefix(claims.ActiveOrganizationRole, clerkOrgRolePrefix),
	}
	if claims.ActiveOrganizationID != "" {
		session.Extra = map[string]any{"organization": claims.ActiveOrganizationID}
	}

	slog.With("session", session).Info("session log")
	slog.With("claims", claims).Info("claims log")

	return session
}
