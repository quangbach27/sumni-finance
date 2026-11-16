variable "name" {
  type = string
}

variable "puller_role_arn" {
  description = "Lightsail ECR image puller role allowed to pull from this repo."
  type        = string
}

variable "keep_images" {
  type    = number
  default = 10
}
