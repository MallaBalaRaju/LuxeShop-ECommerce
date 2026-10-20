# LuxeShop E-Commerce Platform

A beginner-friendly DevOps project demonstrating a full-stack e-commerce application deployed with Docker, Kubernetes, Jenkins CI/CD, Terraform (AWS), and Prometheus/Grafana monitoring.

---

## Technologies Used

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Frontend       | HTML, CSS, JavaScript, Nginx        |
| Backend        | Node.js, Express.js                 |
| Database       | MongoDB 6.0                         |
| Containerization | Docker, Docker Compose            |
| Orchestration  | Kubernetes (Minikube for local)     |
| CI/CD          | Jenkins                             |
| Infrastructure | Terraform, AWS ECR, AWS EC2         |
| Monitoring     | Prometheus, Grafana                 |
| Version Control | Git, GitHub                        |

---

## Architecture Overview

```
Browser
   │
   ▼
Frontend (Nginx on port 3000)
   │   /api/* requests proxied to backend
   ▼
Backend (Node.js on port 5000)
   │
   ├── MongoDB (port 27017)  — product, user, order data
   │
   └── /metrics              — Prometheus scrapes this endpoint
         │
         ▼
      Prometheus (port 9090)
         │
         ▼
      Grafana (port 3005)   — dashboards
```

---

## Folder Structure

```
LuxeShop/
├── frontend/               # Nginx-served HTML/CSS/JS app
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   ├── nginx.conf          # Proxy /api/* to backend
│   └── Dockerfile
├── backend/                # Node.js Express API
│   ├── server.js           # Entry point
│   ├── controllers/        # Business logic
│   ├── routes/             # API route definitions
│   ├── models/             # Mongoose schemas
│   ├── middleware/         # Auth, rate-limiter, validator
│   ├── tests/              # Jest test suites
│   ├── .env.example        # Environment variable template
│   └── Dockerfile
├── k8s/                    # Kubernetes manifests
│   ├── app.yaml            # Backend + Frontend deployments and services
│   ├── database.yaml       # MongoDB StatefulSet
│   ├── monitoring.yaml     # Prometheus + Grafana
│   ├── storageclass.yaml   # AWS EKS StorageClass (disabled for Minikube)
│   └── secrets.yaml        # Secret template (gitignored)
├── terraform/              # AWS infrastructure as code
│   ├── main.tf             # ECR, S3, EC2
│   └── variables.tf        # Variables and outputs
├── monitoring/
│   └── prometheus.yml      # Prometheus scrape config (Docker Compose)
├── docker-compose.yml      # All services for local development
├── Jenkinsfile             # CI/CD pipeline
├── .env.example            # Root environment variable template
├── .gitignore
└── README.md
```

---

## Prerequisites

Install these tools before getting started:

| Tool              | Install Link                                              | Purpose             |
|-------------------|-----------------------------------------------------------|---------------------|
| Docker Desktop    | https://www.docker.com/products/docker-desktop            | Containers          |
| Node.js (v20)     | https://nodejs.org                                        | Backend dev/testing |
| kubectl           | https://kubernetes.io/docs/tasks/tools/                   | Kubernetes CLI      |
| Minikube          | https://minikube.sigs.k8s.io/docs/start/                  | Local Kubernetes    |
| Jenkins           | https://www.jenkins.io/doc/book/installing/               | CI/CD server        |
| Terraform         | https://developer.hashicorp.com/terraform/install          | AWS infra           |
| AWS CLI           | https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html | AWS access |
| Git               | https://git-scm.com/                                      | Version control     |

---

## 1 — Local Setup (No Docker)

```bash
# Clone the repository
git clone https://github.com/MallaBalaRaju/LuxeShop-ECommerce.git
cd LuxeShop-ECommerce

# Set up backend environment
cd backend
cp .env.example .env
# Edit .env and set your MONGO_URI and JWT_SECRET

# Install dependencies
npm install

# Start the backend (MongoDB must be running locally)
npm start
# Backend available at: http://localhost:5000
# Health check:        http://localhost:5000/health
# API products:        http://localhost:5000/api/products

# Frontend — open frontend/index.html directly in a browser
# Or serve it with: npx serve frontend -p 3000
```

---

## 2 — Docker Compose (Recommended for Development)

This starts all services: MongoDB, Backend, Frontend, Prometheus, Grafana.

```bash
# Copy the example env file (edit values if needed)
cp .env.example .env

# Build and start all containers
docker compose up --build

# Services available:
#   Frontend:   http://localhost:3000
#   Backend:    http://localhost:5000
#   Health:     http://localhost:5000/health
#   Metrics:    http://localhost:5000/metrics
#   Prometheus: http://localhost:9090
#   Grafana:    http://localhost:3005   (user: admin / pass: admin123)

# Stop all containers
docker compose down

# Stop and remove volumes (deletes database data)
docker compose down -v
```

---

## 3 — Kubernetes Deployment (Minikube)

### 3a — Start Minikube

```bash
# Start Minikube with enough resources
minikube start --memory=4096 --cpus=2

# Enable the ingress add-on
minikube addons enable ingress

# Allow Minikube to use locally built Docker images
eval $(minikube docker-env)   # Linux/macOS
# On Windows PowerShell:
# & minikube -p minikube docker-env --shell powershell | Invoke-Expression
```

### 3b — Build images inside Minikube

```bash
docker build -t ecommerce-backend:latest ./backend
docker build -t ecommerce-frontend:latest ./frontend
```

### 3c — Apply Kubernetes manifests

```bash
# Create the namespace
kubectl create namespace luxeshop

# Apply secrets (adjust values if needed)
kubectl apply -f k8s/secrets.yaml

# Deploy database, app, and monitoring
kubectl apply -f k8s/database.yaml -n luxeshop
kubectl apply -f k8s/app.yaml -n luxeshop
kubectl apply -f k8s/monitoring.yaml -n luxeshop

# Check status
kubectl get pods -n luxeshop
kubectl get services -n luxeshop
```

### 3d — Access the application

```bash
# Open the frontend directly via Minikube
minikube service frontend-service -n luxeshop

# Or access via Ingress:
# Add this line to your hosts file (C:\Windows\System32\drivers\etc\hosts):
#   <minikube-ip>  luxeshop.local
minikube ip    # get the IP
# Then open http://luxeshop.local in your browser

# Port-forward for direct backend access:
kubectl port-forward service/backend-service 5000:5000 -n luxeshop
```

### 3e — Useful kubectl commands

```bash
# View pod logs
kubectl logs -l app=backend -n luxeshop --tail=50

# Describe a pod
kubectl describe pod <pod-name> -n luxeshop

# Scale backend to 2 replicas
kubectl scale deployment backend --replicas=2 -n luxeshop

# Restart a deployment
kubectl rollout restart deployment/backend -n luxeshop
```

---

## 4 — Jenkins CI/CD Pipeline

### 4a — Install Jenkins

> Download from https://www.jenkins.io/download/

### 4b — Required Jenkins Plugins

Install these via **Manage Jenkins → Plugins → Available**:

- Pipeline
- Git
- Docker Pipeline
- AnsiColor (optional, for coloured output)
- Credentials Binding

### 4c — Required Jenkins Tools

Go to **Manage Jenkins → Tools** and configure:

- **NodeJS** — install NodeJS 20.x, name it `NodeJS`
- **Docker** — configure Docker installation

### 4d — Required Jenkins Credentials

Go to **Manage Jenkins → Credentials → Global → Add Credential**:

| Credential ID          | Type        | Description                         |
|------------------------|-------------|-------------------------------------|
| `aws-access-key-id`    | Secret Text | Your AWS Access Key ID              |
| `aws-secret-access-key`| Secret Text | Your AWS Secret Access Key          |
| `kubeconfig`           | Secret File | Your `~/.kube/config` file          |

> **Note:** The ECR push and Kubernetes deploy stages are optional. They are skipped gracefully if credentials are not configured.

### 4e — Create the Jenkins Pipeline

1. Click **New Item → Pipeline**
2. Name it `LuxeShop-CICD`
3. Under **Pipeline → Definition**, select `Pipeline script from SCM`
4. Set **SCM** to `Git` with URL `https://github.com/MallaBalaRaju/LuxeShop-ECommerce`
5. Set **Branch** to `*/main`
6. Click **Save** then **Build Now**

### 4f — GitHub Webhook (Automatic Triggering)

1. In Jenkins pipeline settings, check **GitHub hook trigger for GITScm polling**
2. In GitHub repository: **Settings → Webhooks → Add webhook**
   - Payload URL: `http://<your-jenkins-ip>:8080/github-webhook/`
   - Content type: `application/json`
   - Event: `Just the push event`

### 4g — Pipeline Stages

```
1. Checkout     → Clone latest code from GitHub
2. Install & Test → npm ci + npm test (fails build if tests fail)
3. Verify Docker → Confirms Docker is running on agent
4. Build Images → docker build for backend and frontend
5. Push to ECR  → Optional: push images to AWS ECR (skipped if no credentials)
6. Deploy to K8s → Optional: kubectl apply + rollout (skipped if no kubeconfig)
7. Verify       → Health check on backend
```

---

## 5 — Terraform (AWS Infrastructure)

### What it creates

- **ECR repositories** — for pushing backend and frontend Docker images
- **S3 bucket** — for static assets (versioning enabled, public access blocked)
- **EC2 instance** — Amazon Linux 2023, t2.micro, Docker pre-installed

### Commands

```bash
cd terraform

# Set AWS credentials (do NOT hardcode these in any file)
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
export AWS_DEFAULT_REGION="ap-south-1"

# Initialize Terraform
terraform init

# Review what will be created
terraform plan

# Create the resources (you will be asked to confirm)
terraform apply

# When done (destroys all created resources — be careful!)
terraform destroy
```

### Cost Warning

> The EC2 t2.micro instance is **free-tier eligible** for the first 12 months (750 hours/month). EKS clusters cost approximately **$0.10/hour** and are **not** included in this simplified Terraform. ECR storage costs are minimal. Always run `terraform destroy` when done to avoid unexpected charges.

---

## 6 — Monitoring (Prometheus + Grafana)

### With Docker Compose

Prometheus and Grafana start automatically with `docker compose up`.

- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3005 (admin / admin123)

### Set Up Grafana Dashboard

1. Open Grafana at http://localhost:3005
2. Go to **Connections → Data Sources → Add data source**
3. Select **Prometheus**
4. Set URL to `http://prometheus-container:9090`
5. Click **Save & Test**
6. Go to **Dashboards → New Dashboard → Add Visualization**
7. Use these example queries:
   - Total HTTP requests: `http_requests_total`
   - Request rate per second: `rate(http_requests_total[1m])`
   - Backend uptime: `process_uptime_seconds{job="ecommerce-backend"}`

### Available Metrics

The backend exposes metrics at `/metrics` (Prometheus format):

| Metric                           | Description                            |
|----------------------------------|----------------------------------------|
| `http_requests_total`            | Total HTTP requests by route/method    |
| `http_request_duration_seconds`  | Request latency histogram              |
| `http_active_connections`        | Current active connections             |
| `orders_created_total`           | Total orders placed                    |
| `user_registrations_total`       | Total user sign-ups                    |

---

## 7 — API Endpoints

| Method | Route               | Description                     |
|--------|---------------------|---------------------------------|
| GET    | `/health`           | Health check (DB status)        |
| GET    | `/metrics`          | Prometheus metrics              |
| GET    | `/api/products`     | List products (search, filter)  |
| POST   | `/api/products/seed`| Seed sample products (dev only) |
| POST   | `/api/auth/register`| Register a new user             |
| POST   | `/api/auth/login`   | Login and get JWT token         |
| GET    | `/api/orders`       | Get orders (auth required)      |
| POST   | `/api/orders`       | Create order (auth required)    |
| GET    | `/api/wishlist`     | Get wishlist (auth required)    |

---

## 8 — Running Tests

```bash
cd backend
npm test                    # Run all tests with coverage report
npm run test:watch          # Watch mode during development
```

Tests use `mongodb-memory-server` — no real database required to run tests.

---

## 9 — Troubleshooting

### Docker containers won't start

```bash
docker compose logs backend    # View backend logs
docker compose logs mongo      # View MongoDB logs
docker compose down && docker compose up --build   # Rebuild
```

### Backend can't connect to MongoDB

- Check that `MONGO_URI` in `.env` matches the service name in docker-compose (`mongo`, not `localhost`)
- In Docker, the URI must be: `mongodb://mongo:27017/luxeshop`
- Locally it is: `mongodb://localhost:27017/luxeshop`

### Kubernetes pods not starting

```bash
kubectl describe pod <pod-name> -n luxeshop   # Read Events section
kubectl logs <pod-name> -n luxeshop
kubectl get events -n luxeshop --sort-by='.lastTimestamp'
```

### Minikube image pull errors (ErrImagePull)

```bash
# Ensure you built the image inside Minikube's Docker:
eval $(minikube docker-env)
docker build -t ecommerce-backend:latest ./backend

# Confirm imagePullPolicy is IfNotPresent in k8s/app.yaml
```

### Jenkins pipeline fails at "Install & Test"

- Ensure NodeJS is configured in Jenkins Tools and available on the agent's PATH
- Or add `which node && node -v` to the pipeline to debug

### Terraform errors

```bash
# Always run plan first, never apply blindly
terraform plan

# If state is corrupted:
terraform refresh
```

---

## 10 — Live Demonstration Steps

Follow these steps to demonstrate the complete project:

**Step 1 — Show the running application**
```bash
docker compose up -d
# Open http://localhost:3000 — browse products, search, add to cart
# Open http://localhost:5000/health — show database status
# Open http://localhost:5000/api/products — show JSON API response
```

**Step 2 — Show monitoring**
```bash
# Open http://localhost:9090 — Prometheus, show targets and metrics
# Open http://localhost:3005 — Grafana dashboard
```

**Step 3 — Trigger the CI/CD pipeline**
```bash
# Make a visible code change, e.g., update a product name in backend/controllers/productController.js
git add .
git commit -m "Demo: update product listing for CI/CD demo"
git push origin main
# Jenkins webhook fires automatically (or click Build Now in Jenkins)
# Watch the pipeline run through all 7 stages
```

**Step 4 — Show Kubernetes deployment**
```bash
minikube start
eval $(minikube docker-env)
docker build -t ecommerce-backend:latest ./backend
docker build -t ecommerce-frontend:latest ./frontend
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/ -n luxeshop
kubectl get pods -n luxeshop
minikube service frontend-service -n luxeshop
```

**Step 5 — Show Terraform**
```bash
cd terraform
terraform init
terraform plan   # Show what would be created on AWS
# (Don't apply unless you want to incur costs)
```

---

## Jenkins Plugins Summary

Quick install list for Jenkins (Manage Jenkins → Plugins):

```
Pipeline
Git
Docker Pipeline
Credentials Binding
AnsiColor
GitHub Integration
```
