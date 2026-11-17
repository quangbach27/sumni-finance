terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Remote state in the bucket created by terraform/bootstrap. The bucket name and the AWS profile
  # are passed by `make tf-init` (-backend-config). use_lockfile locks the state with an S3 object,
  # so no DynamoDB table is needed.
  backend "s3" {
    key          = "dev/terraform.tfstate"
    region       = "ap-southeast-2"
    encrypt      = true
    use_lockfile = true
  }
}
