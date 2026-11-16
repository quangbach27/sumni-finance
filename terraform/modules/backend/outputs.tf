output "name" {
  value = aws_lightsail_container_service.this.name
}

output "arn" {
  value = aws_lightsail_container_service.this.arn
}

output "url" {
  description = "Public HTTPS URL of the container service."
  value       = aws_lightsail_container_service.this.url
}

output "ecr_puller_role_arn" {
  value = aws_lightsail_container_service.this.private_registry_access[0].ecr_image_puller_role[0].principal_arn
}
