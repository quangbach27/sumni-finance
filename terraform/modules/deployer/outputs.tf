output "user_name" {
  description = "IAM user used by CI to push and deploy. Create its access key outside Terraform."
  value       = aws_iam_user.deployer.name
}
