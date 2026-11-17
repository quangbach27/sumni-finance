# Lightsail can only peer with the region's DEFAULT VPC, so the private database lives there.
# The VPC and its subnets are only looked up, never managed (create one with
# `aws ec2 create-default-vpc` if the account has none).
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }

  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-db"
  subnet_ids = data.aws_subnets.default.ids

  tags = { Name = "${var.name}-db" }
}
