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

variable "enable_vpc_peering" {
  description = <<-EOT
    Enable Lightsail VPC peering (account+region wide). Not needed while the DB is public.
    Note: Lightsail only peers with the region's DEFAULT VPC, so a private DB must live there.
  EOT
  type        = bool
  default     = false
}

variable "region" {
  type = string
}
