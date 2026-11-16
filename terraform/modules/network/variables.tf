variable "name" {
  description = "Name prefix for resources."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR of the VPC that hosts the database."
  type        = string
  default     = "10.20.0.0/16"
}

variable "db_public" {
  description = "true: DB subnets are public (internet gateway + default route). false: private subnets, no internet access."
  type        = bool
  default     = false
}
