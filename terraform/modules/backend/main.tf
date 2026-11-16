# The service only provisions capacity + the public endpoint. The container deployment
# (image, env, health check) is created by deploy/lightsail-deploy.sh.
resource "aws_lightsail_container_service" "this" {
  name  = "${var.name}-backend"
  power = var.power
  scale = var.scale

  # Lets Lightsail pull from private ECR; the role ARN is granted on the repo (ecr module).
  private_registry_access {
    ecr_image_puller_role {
      is_active = true
    }
  }
}

resource "terraform_data" "vpc_peering" {
  count = var.enable_vpc_peering ? 1 : 0

  provisioner "local-exec" {
    command = "aws lightsail peer-vpc --region ${var.region}"
  }
}
