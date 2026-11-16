terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

# Local state (single developer). terraform.tfstate holds the IAM access keys' secrets:
# keep it private (it is gitignored) and back it up.
