output "secret_arn" {
  description = "ARN of the backend app secret (Clerk keys)."
  value       = aws_secretsmanager_secret.backend.arn
}

output "runtime_user_name" {
  description = "IAM user the backend container runs as. Create its access key outside Terraform."
  value       = aws_iam_user.runtime.name
}
