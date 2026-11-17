# The access key is created outside Terraform (see terraform/README.md) so the secret never
# lands in the state or in an output.
resource "aws_iam_user" "deployer" {
  name = "${var.name}-deployer"
}

data "aws_iam_policy_document" "deployer" {
  # Push images to the service's own registry (aws lightsail push-container-image) and deploy them.
  statement {
    sid = "LightsailDeploy"
    actions = [
      "lightsail:CreateContainerServiceDeployment",
      "lightsail:GetContainerImages",
      "lightsail:GetContainerLog",
      "lightsail:GetContainerServiceDeployments",
      "lightsail:RegisterContainerImage",
    ]
    resources = [var.lightsail_service_arn]
  }

  # GetContainerServices is a list-style call and the registry login is account-level:
  # neither supports resource-level scoping.
  statement {
    sid = "LightsailDescribe"
    actions = [
      "lightsail:CreateContainerServiceRegistryLogin",
      "lightsail:GetContainerServices",
    ]
    resources = ["*"]
  }

  # CI runs `terraform init` + `terraform output` (read-only, no lock) to get the infra values.
  statement {
    sid       = "StateList"
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${var.state_bucket}"]
  }

  statement {
    sid       = "StateRead"
    actions   = ["s3:GetObject"]
    resources = ["arn:aws:s3:::${var.state_bucket}/${var.state_key}"]
  }

  statement {
    sid       = "WebBucketList"
    actions   = ["s3:ListBucket"]
    resources = [var.web_bucket_arn]
  }

  statement {
    sid       = "WebBucketObjects"
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["${var.web_bucket_arn}/*"]
  }

  statement {
    sid       = "WebInvalidate"
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [var.cloudfront_distribution_arn]
  }
}

resource "aws_iam_user_policy" "deployer" {
  name   = "deploy"
  user   = aws_iam_user.deployer.name
  policy = data.aws_iam_policy_document.deployer.json
}
