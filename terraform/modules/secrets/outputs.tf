output "secret_arn" {
  description = "ARN of the backend app secret (Clerk keys)."
  value       = aws_secretsmanager_secret.backend.arn
}

output "runtime_access_key_id" {
  value = aws_iam_access_key.runtime.id
}

output "runtime_secret_access_key" {
  value     = aws_iam_access_key.runtime.secret
  sensitive = true
}
