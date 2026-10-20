# ===================================================================
# LuxeShop Terraform — Minimal AWS Infrastructure
#
# What this creates:
#   1. Two ECR repositories (backend + frontend Docker images)
#   2. One S3 bucket (optional assets / Terraform state)
#   3. One EC2 instance (t2.micro — free-tier eligible, for demos)
#
# IMPORTANT: Run these commands before applying:
#   export AWS_ACCESS_KEY_ID="your_key"
#   export AWS_SECRET_ACCESS_KEY="your_secret"
#   export AWS_DEFAULT_REGION="ap-south-1"
#
# Commands:
#   terraform init
#   terraform plan
#   terraform apply     # creates resources (costs apply for EC2 if t2.micro limit exceeded)
#   terraform destroy   # removes all resources
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

# ─── Data: current AWS account ───────────────────────────────────────
data "aws_caller_identity" "current" {}

# ─── ECR: Backend image repository ───────────────────────────────────
resource "aws_ecr_repository" "backend" {
  name                 = var.backend_repo_name
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ─── ECR: Frontend image repository ──────────────────────────────────
resource "aws_ecr_repository" "frontend" {
  name                 = var.frontend_repo_name
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ─── S3: Optional bucket for assets or Terraform remote state ────────
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

# ─── EC2: Single instance for running Docker Compose (demo / free tier) ──
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
    cidr_blocks = ["0.0.0.0/0"] # Restrict to your IP in production
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

  # Install Docker & Docker Compose on startup
  user_data = <<-EOF
    #!/bin/bash
    dnf update -y
    dnf install -y docker git
    systemctl start docker
    systemctl enable docker
    usermod -aG docker ec2-user
    # Install Docker Compose plugin
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
