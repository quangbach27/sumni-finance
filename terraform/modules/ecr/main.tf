resource "aws_ecr_repository" "backend" {
  name                 = "${var.name}/backend"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last ${var.keep_images} images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = var.keep_images
      }
      action = { type = "expire" }
    }]
  })
}

data "aws_iam_policy_document" "pull" {
  statement {
    sid     = "LightsailPull"
    actions = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"]

    principals {
      type        = "AWS"
      identifiers = [var.puller_role_arn]
    }
  }
}

resource "aws_ecr_repository_policy" "backend" {
  repository = aws_ecr_repository.backend.name
  policy     = data.aws_iam_policy_document.pull.json
}
