variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "db_subnet_group_name" {
  type = string
}

variable "lightsail_cidr" {
  description = "CIDR of the Lightsail VPC in this region, the only network allowed to reach Postgres (5432)."
  type        = string
  default     = "172.26.0.0/16"
}

variable "engine_version" {
  type    = string
  default = "18"
}

variable "parameter_group_family" {
  type    = string
  default = "postgres18"
}

variable "instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "allocated_storage" {
  type    = number
  default = 20
}

variable "db_name" {
  type    = string
  default = "sumni_finance"
}

variable "master_username" {
  type    = string
  default = "sumni"
}

variable "backup_retention_days" {
  type    = number
  default = 1
}

variable "deletion_protection" {
  type    = bool
  default = false
}

variable "skip_final_snapshot" {
  type    = bool
  default = true
}
