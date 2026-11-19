output "region" {
  value = var.region
}

output "web_url" {
  description = "CloudFront URL (use for CORS_ALLOWED_ORIGINS and CLERK_AUTHORIZED_PARTIES)."
  value       = module.web.url
}

output "web_bucket" {
  value = module.web.bucket_name
}

output "web_distribution_id" {
  value = module.web.distribution_id
}

output "api_url" {
  description = "Lightsail HTTPS URL (use for VITE_API_BASE_URL)."
  value       = module.backend.url
}

output "lightsail_service" {
  value = module.backend.name
}

output "db_host" {
  value = module.database.address
}

output "db_name" {
  value = module.database.db_name
}

output "bastion_instance_id" {
  description = "Target for `aws ssm start-session` (null when var.bastion_enabled is false)."
  value       = module.bastion.instance_id
}

output "db_secret_arn" {
  value = module.database.master_secret_arn
}

output "backend_secret_arn" {
  description = "App secret holding the Clerk keys (put-secret-value target)."
  value       = module.secrets.secret_arn
}

# Access keys are not managed by Terraform. Create them for these users with
# `aws iam create-access-key` (see terraform/README.md).
output "runtime_user" {
  value = module.secrets.runtime_user_name
}

output "deployer_user" {
  value = module.deployer.user_name
}
