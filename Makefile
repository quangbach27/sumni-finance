.PHONY: up down down-clean seed web storybook docs docs-preview docs-lint tf-bootstrap tf-init tf-plan tf-apply image-push lightsail-deploy web-deploy

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
TF_BOOTSTRAP_DIR := terraform/bootstrap
AWS_PROFILE ?= sumni-finance-dev

# One-off: create the S3 bucket that holds the remote Terraform state
tf-bootstrap:
	terraform -chdir=$(TF_BOOTSTRAP_DIR) init
	terraform -chdir=$(TF_BOOTSTRAP_DIR) apply

tf-init:
	terraform -chdir=$(TF_DIR) init \
		-backend-config="bucket=$$(terraform -chdir=$(TF_BOOTSTRAP_DIR) output -raw state_bucket)" \
		-backend-config="profile=$(AWS_PROFILE)"

tf-plan:
	terraform -chdir=$(TF_DIR) plan

tf-apply:
	terraform -chdir=$(TF_DIR) apply

# Build + push backend image to the Lightsail registry (TAG defaults to git short SHA)
image-push:
	deploy/image-push.sh $(TAG)

# Create a Lightsail deployment for an image already in the Lightsail registry
lightsail-deploy:
	deploy/lightsail-deploy.sh $(TAG)

# Build web and publish to S3 + CloudFront
web-deploy:
	deploy/web-deploy.sh
