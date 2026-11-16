data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.name}-vpc" }
}

resource "aws_subnet" "db" {
  count = length(local.azs)

  vpc_id                  = aws_vpc.this.id
  availability_zone       = local.azs[count.index]
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  map_public_ip_on_launch = var.db_public

  tags = { Name = "${var.name}-db-${local.azs[count.index]}" }
}

resource "aws_internet_gateway" "this" {
  count  = var.db_public ? 1 : 0
  vpc_id = aws_vpc.this.id

  tags = { Name = "${var.name}-igw" }
}

resource "aws_route_table" "db" {
  vpc_id = aws_vpc.this.id

  tags = { Name = "${var.name}-db-rt" }
}

resource "aws_route" "internet" {
  count = var.db_public ? 1 : 0

  route_table_id         = aws_route_table.db.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this[0].id
}

resource "aws_route_table_association" "db" {
  count = length(aws_subnet.db)

  subnet_id      = aws_subnet.db[count.index].id
  route_table_id = aws_route_table.db.id
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-db"
  subnet_ids = aws_subnet.db[*].id

  tags = { Name = "${var.name}-db" }
}
