variable "name" {
  type = string
}

variable "power" {
  description = "Lightsail container power (nano, micro, small, ...)."
  type        = string
  default     = "nano"
}

variable "scale" {
  type    = number
  default = 1
}

variable "region" {
  type = string
}

variable "aws_profile" {
  description = "AWS CLI profile used to enable Lightsail VPC peering."
  type        = string
}
