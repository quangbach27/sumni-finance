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

output "ecr_repository_url" {
  value = module.ecr.repository_url
}

output "db_host" {
  value = module.database.address
}

output "db_name" {
  value = module.database.db_name
}

output "db_secret_arn" {
  value = module.database.master_secret_arn
}

output "backend_secret_arn" {
  description = "App secret holding the Clerk keys (put-secret-value target)."
  value       = module.secrets.secret_arn
}

output "runtime_access_key_id" {
  value = module.secrets.runtime_access_key_id
}

output "runtime_secret_access_key" {
  value     = module.secrets.runtime_secret_access_key
  sensitive = true
}

output "deployer_access_key_id" {
  value = module.deployer.access_key_id
}

output "deployer_secret_access_key" {
  value     = module.deployer.secret_access_key
  sensitive = true
}
