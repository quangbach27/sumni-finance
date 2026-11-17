variable "name" {
  type = string
}

variable "lightsail_service_arn" {
  type = string
}

variable "web_bucket_arn" {
  type = string
}

variable "cloudfront_distribution_arn" {
  type = string
}

variable "state_bucket" {
  description = "Name of the Terraform state bucket. CI reads `terraform output` from it."
  type        = string
}

variable "state_key" {
  description = "Object key of this environment's state file."
  type        = string
}
