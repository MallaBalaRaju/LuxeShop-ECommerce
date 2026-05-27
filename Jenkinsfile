pipeline {
    agent any

    environment {
        AWS_REGION = 'us-east-1'
        // Jenkins Credentials ID containing AWS access key and secret key
        AWS_CRED = credentials('aws-credentials-id')
        // Replace with your actual AWS Account ID or set it as a Jenkins global environment variable
        AWS_ACCOUNT_ID = '123456789012'
        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }

        stage('Terraform Init & Apply') {
            steps {
                echo 'Initializing and applying Terraform configuration for AWS ECR...'
                dir('terraform') {
                    // Inject AWS credentials into Terraform execution environment
                    withEnv([
                        "AWS_ACCESS_KEY_ID=${AWS_CRED_USR}",
                        "AWS_SECRET_ACCESS_KEY=${AWS_CRED_PSW}",
                        "AWS_DEFAULT_REGION=${AWS_REGION}"
                    ]) {
                        bat 'terraform init'
                        bat 'terraform apply -auto-approve'
                    }
                }
            }
        }

        stage('Docker Registry Login') {
            steps {
                echo 'Logging in to AWS Elastic Container Registry (ECR)...'
                withEnv([
                    "AWS_ACCESS_KEY_ID=${AWS_CRED_USR}",
                    "AWS_SECRET_ACCESS_KEY=${AWS_CRED_PSW}",
                    "AWS_DEFAULT_REGION=${AWS_REGION}"
                ]) {
                    // Windows batch command to retrieve ECR login token and authenticate Docker daemon
                    bat "aws ecr get-login-password --region %AWS_REGION% | docker login --username AWS --password-stdin %ECR_REGISTRY%"
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo 'Building container images for frontend and backend...'
                bat "docker build -t %ECR_REGISTRY%/ecommerce-frontend:latest ./frontend"
                bat "docker build -t %ECR_REGISTRY%/ecommerce-backend:latest ./backend"
            }
        }

        stage('Push Docker Images to AWS ECR') {
            steps {
                echo 'Pushing images to AWS ECR...'
                bat "docker push %ECR_REGISTRY%/ecommerce-frontend:latest"
                bat "docker push %ECR_REGISTRY%/ecommerce-backend:latest"
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution complete.'
        }
        success {
            echo 'Successfully built and pushed new application versions to AWS ECR.'
            // Optional local image cleanup to conserve disk space on Jenkins node
            bat "docker rmi %ECR_REGISTRY%/ecommerce-frontend:latest || exit 0"
            bat "docker rmi %ECR_REGISTRY%/ecommerce-backend:latest || exit 0"
        }
        failure {
            echo 'Build failed. Check stage logs for troubleshooting details.'
        }
    }
}
