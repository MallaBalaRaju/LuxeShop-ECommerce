# ===================================================================
# LuxeShop Terraform — Minimal AWS Infrastructure
#
# What this creates:
#   1. Two ECR repositories (backend + frontend Docker images)
#   2. One S3 bucket (optional assets / Terraform state)
#   3. One EC2 instance (t2.micro — free-tier eligible, for demos)
#
# Commands:
#   terraform init
#   terraform plan
#   terraform apply
#   terraform destroy
# ===================================================================

terraform {
  required_version = ">= 1.3.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project   = "LuxeShop-ECommerce"
      ManagedBy = "Terraform"
    }
  }
}

# ─── Variables ───────────────────────────────────────────────────────
variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "ap-south-1"
}

variable "backend_repo_name" {
  description = "ECR repository name for backend Docker image"
  type        = string
  default     = "backend"
}

variable "frontend_repo_name" {
  description = "ECR repository name for frontend Docker image"
  type        = string
  default     = "frontend"
}

variable "instance_type" {
  description = "EC2 instance type (t2.micro is free-tier eligible)"
  type        = string
  default     = "t2.micro"
}

# ─── Data: Current AWS Account ───────────────────────────────────────
data "aws_caller_identity" "current" {}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ─── ECR: Repositories ───────────────────────────────────────────────
resource "aws_ecr_repository" "backend" {
  name                 = var.backend_repo_name
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = var.frontend_repo_name
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ─── S3: Assets Bucket ───────────────────────────────────────────────
resource "aws_s3_bucket" "assets" {
  bucket        = "luxeshop-assets-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── EC2: Security Group & App Server ─────────────────────────────────
resource "aws_security_group" "ec2_sg" {
  name        = "luxeshop-ec2-sg"
  description = "Allow HTTP, HTTPS and SSH access"

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "App port (backend)"
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "App port (frontend)"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "luxeshop-ec2-sg" }
}

resource "aws_instance" "app_server" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.instance_type
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  associate_public_ip_address = true

  user_data = <<-EOF
    #!/bin/bash
    dnf update -y
    dnf install -y docker git
    systemctl start docker
    systemctl enable docker
    usermod -aG docker ec2-user
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  EOF

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name = "luxeshop-app-server"
  }
}

# ─── Outputs ─────────────────────────────────────────────────────────
output "backend_ecr_url" {
  description = "URL to push backend Docker image to ECR"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_url" {
  description = "URL to push frontend Docker image to ECR"
  value       = aws_ecr_repository.frontend.repository_url
}

output "s3_bucket_name" {
  description = "Name of the S3 assets bucket"
  value       = aws_s3_bucket.assets.id
}

output "ec2_public_ip" {
  description = "Public IP of the EC2 app server"
  value       = aws_instance.app_server.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS of the EC2 app server"
  value       = aws_instance.app_server.public_dns
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app_server.id
}
