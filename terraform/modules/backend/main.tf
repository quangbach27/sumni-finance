# The service only provisions capacity + the public endpoint. Images are pushed to the service's
# own registry (Backend Commit Stage / deploy/image-push.sh) and the container deployment
# (image, env, health check) is created by deploy/lightsail-deploy.sh.
# Private ECR pull is not used: the org's resource control policy denies Lightsail's puller role.
resource "aws_lightsail_container_service" "this" {
  name  = "${var.name}-backend"
  power = var.power
  scale = var.scale
}

# Peers the Lightsail VPC with the region's default VPC so the containers can reach the private
# database. The setting is account + region wide and has no Terraform resource.
resource "terraform_data" "vpc_peering" {
  input = {
    region  = var.region
    profile = var.aws_profile
  }

  provisioner "local-exec" {
    command = "aws lightsail peer-vpc --region ${self.input.region} --profile ${self.input.profile}"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "aws lightsail unpeer-vpc --region ${self.input.region} --profile ${self.input.profile}"
  }
}
