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
