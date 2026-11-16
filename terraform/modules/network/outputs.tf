output "vpc_id" {
  value = aws_vpc.this.id
}

output "vpc_cidr" {
  value = aws_vpc.this.cidr_block
}

output "db_subnet_group_name" {
  value = aws_db_subnet_group.this.name
}

output "db_route_table_id" {
  value = aws_route_table.db.id
}
