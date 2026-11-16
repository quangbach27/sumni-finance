variable "name" {
  type = string
}

variable "db_secret_arn" {
  description = "ARN of the RDS-managed master secret."
  type        = string
}

variable "recovery_window_in_days" {
  description = "0 deletes immediately (dev); 7-30 keeps the secret recoverable."
  type        = number
  default     = 0
}
