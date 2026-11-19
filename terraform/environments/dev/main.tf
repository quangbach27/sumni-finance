provider "aws" {
  region  = var.region
  profile = var.aws_profile

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  name = "${var.project}-${var.environment}"

  # Bucket created by terraform/bootstrap; the key matches backend "s3" in versions.tf.
  state_bucket = "${var.project}-tfstate-${data.aws_caller_identity.current.account_id}"
  state_key    = "${var.environment}/terraform.tfstate"
}

module "network" {
  source = "../../modules/network"

  name = local.name
}

module "database" {
  source = "../../modules/database"

  name                 = local.name
  vpc_id               = module.network.vpc_id
  db_subnet_group_name = module.network.db_subnet_group_name
  instance_class       = var.db_instance_class
}

module "bastion" {
  source = "../../modules/bastion"

  name                 = local.name
  enabled              = var.bastion_enabled
  vpc_id               = module.network.vpc_id
  subnet_id            = module.network.subnet_ids[0]
  db_security_group_id = module.database.security_group_id
}

# Lives here, not in a module, so the database and bastion modules don't depend on each other.
resource "aws_vpc_security_group_ingress_rule" "db_from_bastion" {
  security_group_id            = module.database.security_group_id
  description                  = "Postgres from the SSM bastion"
  referenced_security_group_id = module.bastion.security_group_id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

module "backend" {
  source = "../../modules/backend"

  name        = local.name
  region      = var.region
  aws_profile = var.aws_profile
  power       = var.lightsail_power
  scale       = var.lightsail_scale
}

module "secrets" {
  source = "../../modules/secrets"

  name          = local.name
  db_secret_arn = module.database.master_secret_arn
}

module "web" {
  source = "../../modules/web"

  name = local.name
}

module "deployer" {
  source = "../../modules/deployer"

  name                        = local.name
  lightsail_service_arn       = module.backend.arn
  web_bucket_arn              = module.web.bucket_arn
  cloudfront_distribution_arn = module.web.distribution_arn
  state_bucket                = local.state_bucket
  state_key                   = local.state_key
}
