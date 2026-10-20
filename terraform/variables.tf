# ===================================================================
# Terraform Variables
# ===================================================================

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

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app_server.id
}
