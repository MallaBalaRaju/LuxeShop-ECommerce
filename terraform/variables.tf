# ===================================================================
# Terraform Variables — LuxeShop Infrastructure
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
