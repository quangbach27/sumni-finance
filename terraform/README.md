# AWS infrastructure (dev)

Region `ap-southeast-2`. Terraform state is remote: an S3 bucket (versioned, encrypted) with S3 lockfile locking.

| Piece | Service |
|---|---|
| Backend | Lightsail container service, image in the service's own registry (CI also keeps a copy in GHCR) |
| Web | S3 (private) + CloudFront (OAC, SPA fallback to `index.html`) |
| Database | RDS Postgres 18 (`db.t4g.micro`), **private** (no public endpoint, TLS forced), in the region's default VPC. Only the Lightsail network can reach it, through Lightsail VPC peering |
| Secrets | Secrets Manager: the RDS-managed DB secret (`rds!db-...`, native rotation) and one app secret `<name>/backend` (Clerk keys) |
| IAM | `*-deployer` (push/deploy only), `*-backend-runtime` (read those 2 secrets only; its key is handed to Lightsail). Terraform creates the users and policies only: **access keys are created outside Terraform**, so they are never in the state or in an output |
| State | S3 bucket `sumni-finance-tfstate-<account>` created by `terraform/bootstrap` |

```
terraform/
  bootstrap             # state bucket (applied once, local state, nothing secret)
  modules/{network,database,secrets,backend,deployer,web}
  environments/dev      # wires the modules together (state in S3)
deploy/                 # scripts used by the root Makefile
```

## First-time setup

1. **Provision** (with an admin AWS profile): `make tf-bootstrap` (once, creates the state bucket), then `make tf-init && make tf-apply`. The account needs a default VPC in the region (`aws ec2 create-default-vpc` if it was deleted).
2. **Clerk secret** (one JSON secret; the value never goes in Terraform state):
   ```sh
   T="terraform -chdir=terraform/environments/dev"
   aws secretsmanager put-secret-value --secret-id "$($T output -raw backend_secret_arn)" \
     --secret-string '{"CLERK_SECRET_KEY":"sk_...","CLERK_WEBHOOK_SIGNING_SECRET":"whsec_..."}'
   ```
3. **Access keys** (not managed by Terraform). Create one key per user and send it straight to the GitHub `dev` environment, so the secret is never printed or stored on disk:
   ```sh
   set_key() { # set_key <iam user> <id secret name> <secret secret name>
     local key; key="$(aws iam create-access-key --user-name "$1" --output json)"
     jq -r .AccessKey.AccessKeyId     <<<"$key" | gh secret set "$2" --env dev
     jq -r .AccessKey.SecretAccessKey <<<"$key" | gh secret set "$3" --env dev
   }
   set_key "$($T output -raw deployer_user)" AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
   set_key "$($T output -raw runtime_user)"  RUNTIME_ACCESS_KEY_ID RUNTIME_SECRET_ACCESS_KEY
   ```
   To rotate: run it again, then delete the old key (`aws iam list-access-keys` / `delete-access-key`) and redeploy the backend. Local scripts use your admin profile (`AWS_PROFILE`, default `sumni-finance-dev`); a local `make lightsail-deploy` also needs `RUNTIME_ACCESS_KEY_ID` and `RUNTIME_SECRET_ACCESS_KEY` in the environment.
4. **Backend**: `make image-push` then `make lightsail-deploy` (optional `TAG=...`; default is the short git SHA). `image-push` builds the image and pushes it to the Lightsail registry with the tag as its label; `lightsail-deploy` deploys the newest image with that label and waits until it is active (it fails and prints the container log otherwise). Needs `docker buildx`, `jq`, `terraform` and the `lightsailctl` plugin (`brew install aws/tap/lightsailctl`). The container runs migrations on startup.
5. **Web**: `VITE_CLERK_PUBLISHABLE_KEY=pk_... make web-deploy`. `VITE_API_BASE_URL` defaults to the Lightsail URL.
6. Add the CloudFront URL (`web_url` output) to Clerk's allowed origins. The deploy script already sets it as `CORS_ALLOWED_ORIGINS` and `CLERK_AUTHORIZED_PARTIES` on the backend.

Order matters: deploy the backend *after* the Clerk secrets are set (the app fails to start on an empty secret), and the web *after* the backend so the API URL exists. The CloudFront URL is only known after step 1, so the backend deploy in step 4 picks it up automatically.

## CI/CD (GitHub Actions, backend)

Terraform only **creates** the AWS resources, and runs locally. CI never applies it: each job runs `terraform init` + `terraform output` (read-only) through the `.github/actions/terraform-outputs` action and `deploy/tf-env.sh`, which export the non-secret infra values (service name, DB host, secret ARNs, bucket, distribution id, URLs) for the following steps. The deployer IAM user may read the state object `dev/terraform.tfstate` for that (nothing else in the bucket). Only the values below live in the `dev` GitHub environment.

Two manually triggered workflows, both using the `dev` GitHub environment:

1. **Backend Commit Stage**: lint, test, build, scan and publish the image. It is pushed to **GHCR** (`ghcr.io/<owner>/<repo>/backend:<sha>`, with the workflow's `GITHUB_TOKEN`) and to the **Lightsail service registry** (label = the commit SHA, registered as `:<service>.<sha>.<n>`). The job summary shows the SHA. Re-running on a published SHA skips the pushes.
2. **Deploy Backend**: takes the image `tag` (a published SHA) as input, finds that image in the Lightsail registry and creates the deployment through `deploy/lightsail-deploy.sh`, then waits for it to become active. Rollback = deploy an older SHA. It does not rebuild or push.

Why not private ECR: Lightsail pulls from ECR with a role in an AWS-owned account, and the organization's resource control policy denies principals outside the org (`ecr:BatchGetImage ... explicit deny in a resource control policy`). The deployment then fails without any container log. Lightsail cannot pull from a private GHCR package either, so the image Lightsail runs always comes from its own registry.

Configure the `dev` environment (values from `terraform output`):

| Kind | Name | Source |
|---|---|---|
| secret | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | access key of the `deployer_user` IAM user (setup step 3) |
| secret | `RUNTIME_ACCESS_KEY_ID`, `RUNTIME_SECRET_ACCESS_KEY` | access key of the `runtime_user` IAM user (setup step 3; handed to Lightsail so the app can read its 2 secrets) |
| var | `AWS_REGION` | `ap-southeast-2` (needed before CI can read anything from Terraform) |
| var | `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (not in Terraform) |

Loaded from `terraform output` at run time, so **no GitHub variable is needed** for them: `LIGHTSAIL_SERVICE`, `DB_HOST`, `DB_NAME`, `DB_SECRET_ARN`, `APP_SECRET_ARN`, `WEB_URL`, `WEB_BUCKET`, `WEB_DISTRIBUTION_ID`, `VITE_API_BASE_URL` (the list is in `deploy/tf-env.sh`). After an infra change nothing has to be copied to GitHub.

### Web workflow (`deploy-web`)

Builds in `web-commit-stage` (it needs `VITE_API_BASE_URL`, so it also loads the Terraform outputs), then syncs `web/dist` to S3 and invalidates CloudFront. Same `dev` environment and deployer credentials as the backend; nothing extra to configure.

## Connecting to the dev DB

The database has no public endpoint: only the Lightsail container service can reach it (security group allows `172.26.0.0/16`, the Lightsail VPC, over the VPC peering enabled by the `backend` module). `psql` from a laptop does not work. Migrations run when the container starts. For ad-hoc queries add a bastion with SSM port forwarding in the default VPC (no module exists yet).

## Secret rotation

The backend reads the DB secret (RDS-managed) and the app secret (`<name>/backend`) from Secrets Manager **at startup** (`configs.LoadSecrets`, env `AWS_SECRET_DB_ARN` / `AWS_SECRET_APP_ARN`) with the runtime IAM user's key. After a rotation, or after changing the Clerk values with `put-secret-value`, redeploy or restart the container to pick up the new values (re-run Deploy Backend with the same tag, or `make lightsail-deploy TAG=<sha>` locally).
The DB secret is RDS-managed, so you can turn on automatic rotation for it in the RDS console or with `aws rds modify-db-instance --manage-master-user-password --rotate-master-user-password`.

## Going to prod later

- Copy `environments/dev` to `environments/prod` with its own state key (`prod/terraform.tfstate`).
- `deletion_protection = true`, `skip_final_snapshot = false`, longer `backup_retention_days`, `recovery_window_in_days = 7` or more.
- Lightsail VPC peering is account + region wide: destroying one environment's `backend` module unpeers it for all of them.

## Cost notes
RDS `db.t4g.micro` with 20 GB and S3/CloudFront fit the 12-month free tier. The Lightsail container service (`nano`) is billed monthly (about $7), apart from any new-account trial. Secrets Manager charges per secret (2 secrets) and is not in the free tier.
