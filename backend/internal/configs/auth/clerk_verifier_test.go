package auth

import (
	"testing"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/stretchr/testify/assert"
)

func TestSessionFromClaims(t *testing.T) {
	claims := &clerk.SessionClaims{}
	claims.Subject = "user_1"
	claims.SessionID = "sess_1"
	claims.ActiveOrganizationID = "org_1"
	claims.ActiveOrganizationRole = "org:office-admin"

	s := sessionFromClaims(claims)

	assert.Equal(t, "user_1", s.Subject)
	assert.Equal(t, "sess_1", s.SessionID)
	assert.Equal(t, "office-admin", s.Role)
	assert.Equal(t, "org_1", s.Extra["organization"])
}

func TestSessionFromClaims_NoOrganization(t *testing.T) {
	claims := &clerk.SessionClaims{}
	claims.Subject = "user_1"

	s := sessionFromClaims(claims)

	assert.Empty(t, s.Role)
	assert.NotContains(t, s.Extra, "organization")
}

func TestIsAuthorizedParty(t *testing.T) {
	open := &ClerkVerifier{}
	assert.True(t, open.isAuthorizedParty("http://evil"))

	v := &ClerkVerifier{authorizedParties: []string{"http://localhost:3000"}}
	assert.True(t, v.isAuthorizedParty("http://localhost:3000"))
	assert.False(t, v.isAuthorizedParty("http://evil"))
}
