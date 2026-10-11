# ===================================================================
# Variables & Outputs Configuration
# ===================================================================

variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "ap-south-1"
}

variable "cluster_name" {
  description = "Name of the AWS EKS Cluster"
  type        = string
  default     = "jenkins-eks-cluster"
}

variable "backend_repo_name" {
  description = "ECR repository name for backend"
  type        = string
  default     = "backend"
}

variable "frontend_repo_name" {
  description = "ECR repository name for frontend"
  type        = string
  default     = "frontend"
}

variable "vpc_cidr" {
  description = "VPC CIDR range"
  type        = string
  default     = "10.0.0.0/16"
}

variable "node_instance_types" {
  description = "EC2 instance types for EKS worker nodes"
  type        = list(string)
  default     = ["t3.micro"]
}

# ==========================================
# Outputs
# ==========================================
output "vpc_id" {
  value = aws_vpc.main.id
}

output "eks_cluster_name" {
  value = aws_eks_cluster.eks.name
}

output "eks_cluster_endpoint" {
  value = aws_eks_cluster.eks.endpoint
}

output "backend_ecr_repository_url" {
  value = aws_ecr_repository.backend_repo.repository_url
}

output "frontend_ecr_repository_url" {
  value = aws_ecr_repository.frontend_repo.repository_url
}
