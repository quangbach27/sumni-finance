variable "region" {
  type    = string
  default = "ap-southeast-2"
}

variable "aws_profile" {
  type    = string
  default = "sumni-finance-dev"
}

variable "project" {
  type    = string
  default = "sumni-finance"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "lightsail_power" {
  type    = string
  default = "nano"
}

variable "lightsail_scale" {
  type    = number
  default = 1
}
