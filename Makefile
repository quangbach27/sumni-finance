.PHONY: up down down-clean seed web storybook docs docs-preview docs-lint tf-init tf-plan tf-apply ecr-push lightsail-deploy web-deploy

OPENAPI_SPEC := api/openapi/ledgers.yml
DOCS_OUT := docs/api/ledgers.html

up:
	docker compose up --build -d
	docker compose logs -f sumni-finance-backend

down:
	docker compose down

# Also removes volumes (wipes Postgres data) and orphans
down-clean:
	docker compose down --volumes --remove-orphans

# Vite dev server on http://localhost:3000
web:
	cd web && npm run dev


# Build static HTML docs -> docs/api/ledgers.html
docs:
	npx @redocly/cli build-docs $(OPENAPI_SPEC) -o $(DOCS_OUT) --title "Sumni Finance - Ledgers API"

# Live preview of the OpenAPI docs with hot reload
docs-preview:
	npx @redocly/cli preview-docs $(OPENAPI_SPEC)

# Lint the OpenAPI spec
docs-lint:
	npx @redocly/cli lint $(OPENAPI_SPEC)

# ---- AWS (dev) ----
TF_DIR := terraform/environments/dev

tf-init:
	terraform -chdir=$(TF_DIR) init

tf-plan:
	terraform -chdir=$(TF_DIR) plan

tf-apply:
	terraform -chdir=$(TF_DIR) apply

# Build + push backend image to ECR (TAG defaults to git short SHA)
ecr-push:
	deploy/ecr-push.sh $(TAG)

# Create a Lightsail deployment for an image already in ECR
lightsail-deploy:
	deploy/lightsail-deploy.sh $(TAG)

# Build web and publish to S3 + CloudFront
web-deploy:
	deploy/web-deploy.sh
