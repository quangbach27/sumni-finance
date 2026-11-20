variable "name" {
  type = string
}

variable "enabled" {
  description = "Set to false to destroy the instance when it is not needed."
  type        = bool
  default     = true
}

variable "vpc_id" {
  type = string
}

variable "subnet_id" {
  description = "Subnet for the instance. It needs outbound internet (public IP) to reach the SSM endpoints."
  type        = string
}

variable "db_security_group_id" {
  description = "Security group of the database; the only target the bastion may reach on 5432."
  type        = string
}

# Must be arm64 (the AMI lookup is arm64) and, on a free-tier account, free-tier eligible:
# aws ec2 describe-instance-types --filters Name=free-tier-eligible,Values=true
variable "instance_type" {
  type    = string
  default = "t4g.micro"
}
