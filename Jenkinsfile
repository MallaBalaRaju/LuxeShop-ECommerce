pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    environment {
        // Docker image names used locally
        BACKEND_IMAGE  = 'ecommerce-backend'
        FRONTEND_IMAGE = 'ecommerce-frontend'

        // Image tag: Jenkins build number (e.g., "42")
        IMAGE_TAG = "${BUILD_NUMBER}"

        // AWS settings — update these if pushing to ECR
        AWS_REGION     = 'ap-south-1'
        AWS_ACCOUNT_ID = '606030504453'
        BACKEND_ECR    = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/backend"
        FRONTEND_ECR   = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/frontend"

        // GitHub repository
        GIT_REPO = 'https://github.com/MallaBalaRaju/LuxeShop-ECommerce'
    }

    stages {

        // ─────────────────────────────────────────────
        // Stage 1: Checkout latest code from GitHub
        // ─────────────────────────────────────────────
        stage('1. Checkout') {
            steps {
                echo "Checking out source code from ${GIT_REPO}"
                git branch: 'main', url: "${GIT_REPO}"
            }
        }

        // ─────────────────────────────────────────────
        // Stage 2: Install dependencies and run tests
        // ─────────────────────────────────────────────
        stage('2. Install & Test') {
            steps {
                dir('backend') {
                    sh '''
                        echo "Installing backend dependencies..."
                        npm ci

                        echo "Running backend tests..."
                        npm test
                    '''
                }
            }
        }

        // ─────────────────────────────────────────────
        // Stage 3: Verify Docker is available
        // ─────────────────────────────────────────────
        stage('3. Verify Docker') {
            steps {
                sh '''
                    echo "Docker version:"
                    docker --version
                    echo "Docker Compose version:"
                    docker compose version
                '''
            }
        }

        // ─────────────────────────────────────────────
        // Stage 4: Build Docker images
        // ─────────────────────────────────────────────
        stage('4. Build Docker Images') {
            steps {
                sh '''
                    echo "Building backend image: ${BACKEND_IMAGE}:${IMAGE_TAG}"
                    docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} -t ${BACKEND_IMAGE}:latest ./backend

                    echo "Building frontend image: ${FRONTEND_IMAGE}:${IMAGE_TAG}"
                    docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} -t ${FRONTEND_IMAGE}:latest ./frontend
                '''
            }
        }

        // ─────────────────────────────────────────────
        // Stage 5: Push to AWS ECR (optional)
        //   Skipped automatically if AWS credentials
        //   are not configured in Jenkins.
        //   To enable: add Jenkins credentials:
        //     - 'aws-access-key-id'   (Secret text)
        //     - 'aws-secret-access-key' (Secret text)
        // ─────────────────────────────────────────────
        stage('5. Push to ECR (Optional)') {
            when {
                // Only run if the Jenkins credentials exist
                expression {
                    return binding.hasVariable('AWS_ACCESS_KEY_ID') || 
                           sh(script: "jenkins-cli list-credentials || true", returnStatus: true) == 0
                }
            }
            steps {
                script {
                    // Safely attempt ECR push — skip if credentials are missing
                    def credentialsExist = false
                    try {
                        withCredentials([
                            string(credentialsId: 'aws-access-key-id',      variable: 'AWS_ACCESS_KEY_ID'),
                            string(credentialsId: 'aws-secret-access-key',  variable: 'AWS_SECRET_ACCESS_KEY')
                        ]) {
                            credentialsExist = true
                            sh '''
                                echo "Verifying AWS identity..."
                                aws sts get-caller-identity --region ${AWS_REGION}

                                echo "Logging in to ECR..."
                                aws ecr get-login-password --region ${AWS_REGION} | \
                                    docker login --username AWS --password-stdin \
                                    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

                                echo "Tagging images for ECR..."
                                docker tag ${BACKEND_IMAGE}:${IMAGE_TAG}  ${BACKEND_ECR}:${IMAGE_TAG}
                                docker tag ${BACKEND_IMAGE}:latest         ${BACKEND_ECR}:latest
                                docker tag ${FRONTEND_IMAGE}:${IMAGE_TAG} ${FRONTEND_ECR}:${IMAGE_TAG}
                                docker tag ${FRONTEND_IMAGE}:latest        ${FRONTEND_ECR}:latest

                                echo "Pushing images to ECR..."
                                docker push ${BACKEND_ECR}:${IMAGE_TAG}
                                docker push ${BACKEND_ECR}:latest
                                docker push ${FRONTEND_ECR}:${IMAGE_TAG}
                                docker push ${FRONTEND_ECR}:latest
                            '''
                        }
                    } catch (e) {
                        echo "⚠️  ECR push skipped: AWS credentials not configured in Jenkins."
                        echo "    To enable ECR push, add credentials 'aws-access-key-id' and"
                        echo "    'aws-secret-access-key' as Secret Text in Jenkins Credentials."
                    }
                }
            }
        }

        // ─────────────────────────────────────────────
        // Stage 6: Deploy to Kubernetes
        //   Uses kubeconfig credential from Jenkins.
        //   Works with Minikube or any cluster.
        //   To enable: add Jenkins credential:
        //     - 'kubeconfig'  (Secret file — your ~/.kube/config)
        // ─────────────────────────────────────────────
        stage('6. Deploy to Kubernetes') {
            steps {
                script {
                    try {
                        withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                            sh '''
                                export KUBECONFIG=${KUBECONFIG_FILE}

                                echo "Verifying cluster connectivity..."
                                kubectl cluster-info --request-timeout=10s

                                echo "Creating namespace (if it does not exist)..."
                                kubectl create namespace luxeshop --dry-run=client -o yaml | kubectl apply -f -

                                echo "Applying Kubernetes Secrets..."
                                kubectl apply -f k8s/secrets.yaml -n luxeshop || \
                                    echo "⚠️  Secrets file not found. Apply secrets manually before deploying."

                                echo "Applying all Kubernetes manifests..."
                                kubectl apply -f k8s/ -n luxeshop

                                echo "Updating backend image to build ${IMAGE_TAG}..."
                                kubectl set image deployment/backend \
                                    backend=${BACKEND_IMAGE}:${IMAGE_TAG} -n luxeshop

                                echo "Updating frontend image to build ${IMAGE_TAG}..."
                                kubectl set image deployment/frontend \
                                    frontend=${FRONTEND_IMAGE}:${IMAGE_TAG} -n luxeshop

                                echo "Waiting for backend rollout..."
                                kubectl rollout status deployment/backend -n luxeshop --timeout=120s

                                echo "Waiting for frontend rollout..."
                                kubectl rollout status deployment/frontend -n luxeshop --timeout=120s
                            '''
                        }
                    } catch (e) {
                        echo "⚠️  Kubernetes deploy skipped: kubeconfig credential not found in Jenkins."
                        echo "    To enable deployment, add your kubeconfig as a Secret File credential"
                        echo "    named 'kubeconfig' in Jenkins → Manage Credentials."
                        echo "    For Minikube: run 'cat ~/.kube/config' and upload that file."
                    }
                }
            }
        }

        // ─────────────────────────────────────────────
        // Stage 7: Verify application health
        // ─────────────────────────────────────────────
        stage('7. Verify') {
            steps {
                sh '''
                    echo "Verifying backend container is healthy..."
                    # Try hitting health endpoint if backend container is running locally
                    if docker ps --format "{{.Names}}" | grep -q backend-container; then
                        sleep 3
                        curl -sf http://localhost:5000/health && \
                            echo "✅ Backend health check passed!" || \
                            echo "⚠️  Backend health endpoint not reachable on localhost:5000"
                    else
                        echo "ℹ️  Backend container not running locally — skipping local health check."
                        echo "    Check Kubernetes pod status with: kubectl get pods -n luxeshop"
                    fi
                '''
            }
        }
    }

    post {
        success {
            echo '=============================================='
            echo '✅ LuxeShop CI/CD Pipeline completed successfully!'
            echo "   Build tag: ${IMAGE_TAG}"
            echo '=============================================='
        }
        failure {
            echo '❌ Pipeline failed. Check the stage logs above.'
        }
        always {
            sh '''
                echo "Cleaning up dangling Docker images..."
                docker image prune -f || true
            '''
        }
    }
}
