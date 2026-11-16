resource "aws_iam_user" "deployer" {
  name = "${var.name}-deployer"
}

data "aws_iam_policy_document" "deployer" {
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrPushBackendImage"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = [var.ecr_repository_arn]
  }

  statement {
    sid = "LightsailDeploy"
    actions = [
      "lightsail:CreateContainerServiceDeployment",
      "lightsail:GetContainerLog",
      "lightsail:GetContainerServiceDeployments",
    ]
    resources = [var.lightsail_service_arn]
  }

  # GetContainerServices is a list-style call without resource-level scoping.
  statement {
    sid       = "LightsailDescribe"
    actions   = ["lightsail:GetContainerServices"]
    resources = ["*"]
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

resource "aws_iam_access_key" "deployer" {
  user = aws_iam_user.deployer.name
}
