resource "aws_security_group" "db" {
  name_prefix = "${var.name}-db-"
  description = "Postgres access for ${var.name}"
  vpc_id      = var.vpc_id

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "${var.name}-db" }
}

resource "aws_vpc_security_group_ingress_rule" "postgres" {
  for_each = toset(var.db_allowed_cidrs)

  security_group_id = aws_security_group.db.id
  description       = "Postgres from ${each.value}"
  cidr_ipv4         = each.value
  from_port         = 5432
  to_port           = 5432
  ip_protocol       = "tcp"
}

resource "aws_db_parameter_group" "this" {
  name_prefix = "${var.name}-"
  family      = var.parameter_group_family

  # Reject non-TLS connections (the backend uses DB_SSLMODE=require).
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "this" {
  identifier = "${var.name}-db"

  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage = var.allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.master_username
  # RDS creates and owns the master password in Secrets Manager (JSON {username,password})
  # and supports automatic rotation of it.
  manage_master_user_password = true

  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [aws_security_group.db.id]
  parameter_group_name   = aws_db_parameter_group.this.name
  publicly_accessible    = var.db_public
  multi_az               = false

  backup_retention_period    = var.backup_retention_days
  auto_minor_version_upgrade = true
  deletion_protection        = var.deletion_protection
  skip_final_snapshot        = var.skip_final_snapshot
  final_snapshot_identifier  = var.skip_final_snapshot ? null : "${var.name}-db-final"
  apply_immediately          = true
}
