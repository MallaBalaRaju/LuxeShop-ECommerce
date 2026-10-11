pipeline {
    agent any

    environment {
        AWS_REGION     = 'ap-south-1'
        // Configurable AWS Account ID (Single place to update for your account)
        AWS_ACCOUNT_ID = '606030504453'

        // ECR Repositories dynamically derived from AWS Account ID
        BACKEND_ECR    = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/backend"
        FRONTEND_ECR   = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/frontend"

        // Dynamic image tag using unique Jenkins build number
        IMAGE_TAG      = "${BUILD_NUMBER}"
        GIT_REPO       = 'https://github.com/MallaBalaRaju/LuxeShop-ECommerce'
    }

    stages {

        stage('1. Checkout Source Code') {
            steps {
                git branch: 'main', url: "${GIT_REPO}"
            }
        }

        stage('2. Backend Automated Testing (TDD/CI)') {
            steps {
                dir('backend') {
                    sh '''
                        npm install --silent
                        npm test
                    '''
                }
            }
        }

        stage('3. Verify Docker Environment') {
            steps {
                sh '''
                    docker --version
                    docker compose version
                '''
            }
        }

        stage('4. Build Microservice Containers') {
            steps {
                sh '''
                    docker compose build
                '''
            }
        }

        stage('5. DevSecOps Vulnerability Scan') {
            steps {
                // Fulfills INT378 Unit V & Practical 7
                sh '''
                    echo "Executing DevSecOps security assessment..."
                    if command -v trivy >/dev/null 2>&1; then
                        trivy image --severity HIGH,CRITICAL --format table ecommerce-backend:latest || true
                        trivy image --severity HIGH,CRITICAL --format table ecommerce-frontend:latest || true
                    else
                        echo "Trivy not installed on host agent, running container vulnerability check..."
                        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image --severity HIGH,CRITICAL ecommerce-backend:latest || true
                    fi
                '''
            }
        }

        stage('6. Tag Container Images') {
            steps {
                sh '''
                    docker tag ecommerce-backend:latest ${BACKEND_ECR}:${IMAGE_TAG}
                    docker tag ecommerce-backend:latest ${BACKEND_ECR}:latest
                    docker tag ecommerce-frontend:latest ${FRONTEND_ECR}:${IMAGE_TAG}
                    docker tag ecommerce-frontend:latest ${FRONTEND_ECR}:latest
                '''
            }
        }

        stage('7. Authenticate & Push to AWS ECR') {
            steps {
                withCredentials([
                    string(credentialsId: 'aws-access-key-id', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'aws-secret-access-key', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {
                    sh '''
                        aws configure set aws_access_key_id ${AWS_ACCESS_KEY_ID}
                        aws configure set aws_secret_access_key ${AWS_SECRET_ACCESS_KEY}
                        aws configure set region ${AWS_REGION}

                        aws ecr get-login-password --region ${AWS_REGION} | \
                        docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

                        docker push ${BACKEND_ECR}:${IMAGE_TAG}
                        docker push ${BACKEND_ECR}:latest
                        docker push ${FRONTEND_ECR}:${IMAGE_TAG}
                        docker push ${FRONTEND_ECR}:latest
                    '''
                }
            }
        }

        stage('8. Continuous Deployment (Kubernetes)') {
            steps {
                withCredentials([
                    file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')
                ]) {
                    sh '''
                        export KUBECONFIG=${KUBECONFIG_FILE}

                        # Apply consolidated Kubernetes manifests (app, database, monitoring)
                        kubectl apply -f k8s/

                        # Rolling update to pull newly pushed images
                        kubectl rollout restart deployment/backend
                        kubectl rollout restart deployment/frontend

                        # Verify rollout status
                        kubectl rollout status deployment/backend --timeout=120s
                        kubectl rollout status deployment/frontend --timeout=120s
                    '''
                }
            }
        }
    }

    post {
        success {
            echo '====================================================='
            echo '✅ LuxeShop Microservices Deployed Successfully to EKS!'
            echo '====================================================='
        }
        failure {
            echo '❌ Pipeline failed! Inspect logs above.'
        }
        always {
            sh '''
                docker system prune -f || true
            '''
        }
    }
}
