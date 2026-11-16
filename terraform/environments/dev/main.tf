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

locals {
  name = "${var.project}-${var.environment}"
}

module "network" {
  source = "../../modules/network"

  name      = local.name
  db_public = true # dev: reachable from your laptop. prod: false.
}

module "database" {
  source = "../../modules/database"

  name                 = local.name
  vpc_id               = module.network.vpc_id
  db_subnet_group_name = module.network.db_subnet_group_name
  db_public            = true
  db_allowed_cidrs     = var.db_allowed_cidrs
  instance_class       = var.db_instance_class
}

module "backend" {
  source = "../../modules/backend"

  name               = local.name
  region             = var.region
  power              = var.lightsail_power
  scale              = var.lightsail_scale
  enable_vpc_peering = false # public DB: not needed
}

module "ecr" {
  source = "../../modules/ecr"

  name            = local.name
  puller_role_arn = module.backend.ecr_puller_role_arn
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
  ecr_repository_arn          = module.ecr.repository_arn
  lightsail_service_arn       = module.backend.arn
  web_bucket_arn              = module.web.bucket_arn
  cloudfront_distribution_arn = module.web.distribution_arn
}
