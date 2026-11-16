package configs

import (
	"context"
	"errors"
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

type fakeSecrets struct {
	values map[string]string
}

func (f fakeSecrets) GetSecretValue(
	_ context.Context,
	in *secretsmanager.GetSecretValueInput,
	_ ...func(*secretsmanager.Options),
) (*secretsmanager.GetSecretValueOutput, error) {
	v, ok := f.values[*in.SecretId]
	if !ok {
		return nil, errors.New("not found")
	}
	return &secretsmanager.GetSecretValueOutput{SecretString: &v}, nil
}

func newTestConfig() *Config {
	return &Config{DB: &DBConfig{Username: "user", Password: "password"}, Clerk: &ClerkConfig{}}
}

func TestLoadSecrets_overridesFromSecretsManager(t *testing.T) {
	cfg := newTestConfig()
	client := fakeSecrets{values: map[string]string{
		"db":  `{"username":"sumni","password":"p@ss:/w?rd"}`,
		"app": `{"CLERK_SECRET_KEY":"sk_test_123","CLERK_WEBHOOK_SIGNING_SECRET":"whsec_abc"}`,
	}}

	if err := loadSecrets(context.Background(), cfg, client, "db", "app"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.DB.Username != "sumni" || cfg.DB.Password != "p@ss:/w?rd" {
		t.Errorf("db creds not loaded: %+v", cfg.DB)
	}
	if cfg.Clerk.ClerkSecretKey != "sk_test_123" || cfg.Clerk.WebhookSigningSecret != "whsec_abc" {
		t.Errorf("clerk secrets not loaded: %+v", cfg.Clerk)
	}
}

func TestLoadSecrets_webhookSecretIsOptional(t *testing.T) {
	cfg := newTestConfig()
	client := fakeSecrets{values: map[string]string{"app": `{"CLERK_SECRET_KEY":"sk_test_123"}`}}

	if err := loadSecrets(context.Background(), cfg, client, "", "app"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Clerk.ClerkSecretKey != "sk_test_123" || cfg.Clerk.WebhookSigningSecret != "" {
		t.Errorf("unexpected clerk config: %+v", cfg.Clerk)
	}
}

func TestLoadSecrets_skipsUnsetArns(t *testing.T) {
	cfg := newTestConfig()

	if err := loadSecrets(context.Background(), cfg, fakeSecrets{}, "", ""); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.DB.Username != "user" || cfg.DB.Password != "password" {
		t.Errorf("config should be unchanged: %+v", cfg.DB)
	}
}

func TestLoadSecrets_errors(t *testing.T) {
	tests := map[string]struct {
		values map[string]string
		dbArn  string
		appArn string
	}{
		"missing db secret":            {values: map[string]string{}, dbArn: "db"},
		"invalid db json":              {values: map[string]string{"db": "not-json"}, dbArn: "db"},
		"db without password":          {values: map[string]string{"db": `{"username":"sumni"}`}, dbArn: "db"},
		"missing app secret":           {values: map[string]string{}, appArn: "app"},
		"invalid app json":             {values: map[string]string{"app": "sk_plain"}, appArn: "app"},
		"app without clerk secret key": {values: map[string]string{"app": `{"CLERK_WEBHOOK_SIGNING_SECRET":"whsec_abc"}`}, appArn: "app"},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			err := loadSecrets(context.Background(), newTestConfig(), fakeSecrets{values: tc.values}, tc.dbArn, tc.appArn)
			if err == nil {
				t.Fatal("expected error")
			}
		})
	}
}

func TestDBConfigDsn_escapesCredentials(t *testing.T) {
	db := &DBConfig{Username: "u", Password: "p@ss:/w?rd#", Host: "h", Port: "5432", Name: "n", SSLMode: "require"}

	want := "postgres://u:p%40ss%3A%2Fw%3Frd%23@h:5432/n?sslmode=require"
	if got := db.Dsn(); got != want {
		t.Errorf("Dsn() = %q, want %q", got, want)
	}
}
