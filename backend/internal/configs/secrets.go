package configs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

// Env vars holding the Secrets Manager ARNs. When unset, the matching values keep coming from
// their plain env vars (local dev, tests).
const (
	// envSecretDBArn points to the RDS-managed secret: {"username": "...", "password": "..."}.
	envSecretDBArn = "AWS_SECRET_DB_ARN"
	// envSecretAppArn points to the app secret: {"CLERK_SECRET_KEY": "...", "CLERK_WEBHOOK_SIGNING_SECRET": "..."}.
	envSecretAppArn = "AWS_SECRET_APP_ARN"
)

// SecretsGetter is the subset of the Secrets Manager client used here.
type SecretsGetter interface {
	GetSecretValue(
		ctx context.Context,
		in *secretsmanager.GetSecretValueInput,
		optFns ...func(*secretsmanager.Options),
	) (*secretsmanager.GetSecretValueOutput, error)
}

// LoadSecrets overrides the secret fields of cfg with values from AWS Secrets Manager, for each
// ARN env var that is set. It is meant to run at startup, so a restart picks up rotated values.
func LoadSecrets(ctx context.Context, cfg *Config) error {
	dbArn := os.Getenv(envSecretDBArn)
	appArn := os.Getenv(envSecretAppArn)

	if dbArn == "" && appArn == "" {
		return nil
	}

	awsCfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return fmt.Errorf("load aws config: %w", err)
	}

	return loadSecrets(ctx, cfg, secretsmanager.NewFromConfig(awsCfg), dbArn, appArn)
}

func loadSecrets(ctx context.Context, cfg *Config, client SecretsGetter, dbArn, appArn string) error {
	if dbArn != "" {
		var creds struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := getSecretJSON(ctx, client, dbArn, &creds); err != nil {
			return err
		}
		if creds.Username == "" || creds.Password == "" {
			return errors.New("db secret is missing username or password")
		}
		cfg.DB.Username = creds.Username
		cfg.DB.Password = creds.Password
	}

	if appArn != "" {
		var app struct {
			ClerkSecretKey       string `json:"CLERK_SECRET_KEY"`
			WebhookSigningSecret string `json:"CLERK_WEBHOOK_SIGNING_SECRET"`
		}
		if err := getSecretJSON(ctx, client, appArn, &app); err != nil {
			return err
		}
		// An empty Clerk key would silently enable dev mock tokens, so refuse it.
		if app.ClerkSecretKey == "" {
			return errors.New("app secret is missing CLERK_SECRET_KEY")
		}
		cfg.Clerk.ClerkSecretKey = app.ClerkSecretKey
		cfg.Clerk.WebhookSigningSecret = app.WebhookSigningSecret
	}

	return nil
}

func getSecretJSON(ctx context.Context, client SecretsGetter, arn string, dst any) error {
	out, err := client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{SecretId: &arn})
	if err != nil {
		return fmt.Errorf("get secret %s: %w", arn, err)
	}
	if out.SecretString == nil || *out.SecretString == "" {
		return fmt.Errorf("secret %s has no string value (not set yet?)", arn)
	}
	if err := json.Unmarshal([]byte(*out.SecretString), dst); err != nil {
		return fmt.Errorf("parse secret %s: %w", arn, err)
	}
	return nil
}
