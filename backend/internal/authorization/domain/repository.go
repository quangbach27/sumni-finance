package domain

import "context"

type AccessGrantRepository interface {
	// CreateAccessGrant stores a new grant.
	// Returns a 409 `access-grant-already-exists` error if the user already has a grant
	// for the same resource and scope.
	CreateAccessGrant(ctx context.Context, grant *AccessGrant) error

	// UpdateAccessGrant loads the grant of the org inside a transaction, runs updateFn
	// and stores the result. Returns a 404 `access-grant-not-found` error if missing.
	UpdateAccessGrant(
		ctx context.Context,
		orgID string,
		uuid AccessGrantUUID,
		updateFn func(ctx context.Context, grant *AccessGrant) error,
	) error

	// DeleteAccessGrant removes the grant of the org.
	// Returns a 404 `access-grant-not-found` error if missing.
	DeleteAccessGrant(ctx context.Context, orgID string, uuid AccessGrantUUID) error
}
