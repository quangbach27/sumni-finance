package configs

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
)

type AppConfig struct {
	Port               int
	Env                string
	CorsAllowedOrigins []string
}

type DBConfig struct {
	Username string
	Password string
	Host     string
	Name     string
	Port     string
	SSLMode  string
}

type ClerkConfig struct {
	// ClerkSecretKey verifies session tokens and calls Clerk's Backend API. Empty means Clerk is
	// disabled (dev mock tokens only).
	ClerkSecretKey string
	// AuthorizedParties are the web origins allowed in the token's azp claim. Empty skips the check.
	AuthorizedParties []string
	// WebhookSigningSecret (whsec_...) verifies the Svix signature of Clerk webhooks.
	WebhookSigningSecret string
}

func (db *DBConfig) Dsn() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", db.Username, db.Password, db.Host, db.Port, db.Name, db.SSLMode)
}

type Config struct {
	App   *AppConfig
	DB    *DBConfig
	Clerk *ClerkConfig
}

func NewConfig() *Config {
	corsOrigins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")

	return &Config{
		App: &AppConfig{
			Port:               getIntEnv("PORT", 4000),
			Env:                getEnv("APP_ENV", "dev"),
			CorsAllowedOrigins: parseOrigins(corsOrigins),
		},
		DB: &DBConfig{
			Username: getEnv("DB_USERNAME", "user"),
			Password: getEnv("DB_PASSWORD", "password"),
			Host:     getEnv("DB_HOST", "localhost"),
			Name:     getEnv("DB_NAME", "wild-workout"),
			Port:     getEnv("DB_PORT", "5432"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		Clerk: &ClerkConfig{
			ClerkSecretKey:       getEnv("CLERK_SECRET_KEY", ""),
			AuthorizedParties:    parseOrigins(getEnv("CLERK_AUTHORIZED_PARTIES", "http://localhost:3000")),
			WebhookSigningSecret: getEnv("CLERK_WEBHOOK_SIGNING_SECRET", ""),
		},
	}
}

func getEnv(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	slog.Debug(fmt.Sprintf("Environment variable %s is not set. Using fallback value: %s", key, fallback))
	return fallback
}

func getIntEnv(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		slog.Debug(fmt.Sprintf("Environment variable %s is not set. Using fallback value: %d", key, fallback))
		return fallback
	}

	intValue, err := strconv.Atoi(value)
	if err != nil {
		slog.Warn(fmt.Sprintf("Environment variable %s has invalid integer value %q. Using fallback value: %d", key, value, fallback))
		return fallback
	}

	return intValue
}

func parseOrigins(raw string) []string {
	parts := strings.Split(raw, ";")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}
