pipeline {
    agent any

    environment {
        AWS_REGION = 'ap-south-1'

        // GitHub Repository
        GIT_REPO = 'https://github.com/MallaBalaRaju/LuxeShop-ECommerce'

        // ECR Repositories matching your active AWS Account ID
        BACKEND_ECR = '606030504453.dkr.ecr.ap-south-1.amazonaws.com/backend'
        FRONTEND_ECR = '606030504453.dkr.ecr.ap-south-1.amazonaws.com/frontend'

        // Image Tags assigned dynamically using Jenkins unique build counts
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {

        stage('Clone Source Code') {
            steps {
                git(
                    branch: 'main',
                    credentialsId: 'github-creds',
                    url: "${GIT_REPO}"
                )
            }
        }

        stage('Verify Docker') {
            steps {
                sh '''
                    docker --version
                    docker compose version
                '''
            }
        }

        stage('Build Docker Containers') {
            steps {
                sh '''
                    docker compose build
                '''
            }
        }

        stage('Tag Backend Image') {
            steps {
                sh '''
                    docker tag ecommerce-backend:latest $BACKEND_ECR:$IMAGE_TAG
                    docker tag ecommerce-backend:latest $BACKEND_ECR:latest
                '''
            }
        }

        stage('Tag Frontend Image') {
            steps {
                sh '''
                    docker tag ecommerce-frontend:latest $FRONTEND_ECR:$IMAGE_TAG
                    docker tag ecommerce-frontend:latest $FRONTEND_ECR:latest
                '''
            }
        }

        stage('Login To AWS ECR') {
            steps {
                // FIXED: Now safely leveraging a standard AWS credentials provider block
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding', 
                    credentialsId: 'aws-credentials-id', 
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID', 
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                ]]) {
                    sh '''
                        aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID
                        aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY
                        aws configure set region $AWS_REGION

                        aws ecr get-login-password --region $AWS_REGION | \
                        docker login --username AWS --password-stdin 606030504453.dkr.ecr.ap-south-1.amazonaws.com
                    '''
                }
            }
        }

        stage('Push Backend Image') {
            steps {
                sh '''
                    docker push $BACKEND_ECR:$IMAGE_TAG
                    docker push $BACKEND_ECR:latest
                '''
            }
        }

        stage('Push Frontend Image') {
            steps {
                sh '''
                    docker push $FRONTEND_ECR:$IMAGE_TAG
                    docker push $FRONTEND_ECR:latest
                '''
            }
        }

        stage('Deploy To Kubernetes') {
            steps {
                withCredentials([
                    file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')
                ]) {
                    sh '''
                        export KUBECONFIG=$KUBECONFIG_FILE

                        # Apply all deployment configurations inside your /k8s folder
                        kubectl apply -f k8s/

                        # Force pods to recycle and pull down newest images from ECR
                        kubectl rollout restart deployment/backend
                        kubectl rollout restart deployment/frontend

                        # Monitor rollout progress live inside Jenkins terminal logs
                        kubectl rollout status deployment/backend
                        kubectl rollout status deployment/frontend
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Application deployed successfully!'
        }

        failure {
            echo 'Pipeline failed!'
        }

        always {
            sh '''
                docker system prune -af
            '''
        }
    }
}
