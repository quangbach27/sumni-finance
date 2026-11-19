output "vpc_id" {
  value = data.aws_vpc.default.id
}

output "db_subnet_group_name" {
  value = aws_db_subnet_group.this.name
}

output "subnet_ids" {
  value = data.aws_subnets.default.ids
}
