# One secret for the app's own secrets (the DB credentials stay in the RDS-managed secret).
# Container only: set the value out-of-band so it never lands in Terraform state:
#   aws secretsmanager put-secret-value --secret-id <arn> \
#     --secret-string '{"CLERK_SECRET_KEY":"sk_...","CLERK_WEBHOOK_SIGNING_SECRET":"whsec_..."}'
resource "aws_secretsmanager_secret" "backend" {
  name                    = "${var.name}/backend"
  description             = "Backend app secrets: CLERK_SECRET_KEY, CLERK_WEBHOOK_SIGNING_SECRET"
  recovery_window_in_days = var.recovery_window_in_days
}

# Runtime identity for the Lightsail container (Lightsail has no instance role).
resource "aws_iam_user" "runtime" {
  name = "${var.name}-backend-runtime"
}

data "aws_iam_policy_document" "runtime" {
  statement {
    sid     = "ReadBackendSecrets"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      var.db_secret_arn,
      aws_secretsmanager_secret.backend.arn,
    ]
  }
}

resource "aws_iam_user_policy" "runtime" {
  name   = "read-backend-secrets"
  user   = aws_iam_user.runtime.name
  policy = data.aws_iam_policy_document.runtime.json
}

resource "aws_iam_access_key" "runtime" {
  user = aws_iam_user.runtime.name
}
