# Jump host for ad-hoc psql sessions against the private database. It has no inbound access and no
# SSH key: you reach it only through SSM Session Manager port forwarding (see terraform/README.md).
data "aws_ssm_parameter" "ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "this" {
  count = var.enabled ? 1 : 0

  name_prefix        = "${var.name}-bastion-"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy_attachment" "ssm" {
  count = var.enabled ? 1 : 0

  role       = aws_iam_role.this[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "this" {
  count = var.enabled ? 1 : 0

  name_prefix = "${var.name}-bastion-"
  role        = aws_iam_role.this[0].name
}

# No ingress rules at all: SSM connects outbound from the instance.
resource "aws_security_group" "this" {
  name_prefix = "${var.name}-bastion-"
  description = "SSM-only bastion for ${var.name}"
  vpc_id      = var.vpc_id

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "${var.name}-bastion" }
}

resource "aws_vpc_security_group_egress_rule" "ssm" {
  security_group_id = aws_security_group.this.id
  description       = "HTTPS to the SSM endpoints"
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "postgres" {
  security_group_id            = aws_security_group.this.id
  description                  = "Postgres to the database"
  referenced_security_group_id = var.db_security_group_id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "aws_instance" "this" {
  count = var.enabled ? 1 : 0

  ami                         = nonsensitive(data.aws_ssm_parameter.ami.value)
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.this.id]
  iam_instance_profile        = aws_iam_instance_profile.this[0].name
  associate_public_ip_address = true

  metadata_options {
    http_tokens = "required"
  }

  root_block_device {
    encrypted = true
  }

  # Don't replace the instance every time AWS publishes a newer AMI.
  lifecycle {
    ignore_changes = [ami]
  }

  tags = { Name = "${var.name}-bastion" }
}
