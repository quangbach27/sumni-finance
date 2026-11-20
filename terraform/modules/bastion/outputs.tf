output "security_group_id" {
  value = aws_security_group.this.id
}

output "instance_id" {
  description = "Target for `aws ssm start-session`; null when the bastion is disabled."
  value       = one(aws_instance.this[*].id)
}
