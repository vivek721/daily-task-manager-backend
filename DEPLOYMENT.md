# Deployment Guide

This guide covers deploying the Daily Task Manager Backend to various environments including staging and production.

## 📋 Prerequisites

- Docker and Docker Compose
- PostgreSQL 15+ database
- Domain name and SSL certificates (for production)
- Cloud provider account (AWS, GCP, Azure, etc.)

## 🔧 Environment Configuration

### Required Environment Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Application environment | `production` | Yes |
| `PORT` | Server port | `3001` | No |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | Yes |
| `JWT_SECRET` | JWT signing secret (32+ characters) | `your-super-secure-jwt-secret` | Yes |
| `SESSION_SECRET` | Session signing secret (32+ characters) | `your-super-secure-session-secret` | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `123456789.apps.googleusercontent.com` | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `your-google-client-secret` | Yes |
| `FRONTEND_URL` | Frontend application URL | `https://app.daily-task-manager.com` | Yes |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` |
| `JWT_EXPIRES_IN` | JWT token expiration | `7d` |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `LOG_LEVEL` | Logging level | `info` |

## 🚀 Deployment Options

### Option 1: Docker Deployment (Recommended)

#### 1. Build and Push Docker Image

```bash
# Build image
docker build -t daily-task-manager-backend:latest .

# Tag for registry
docker tag daily-task-manager-backend:latest your-registry/daily-task-manager-backend:latest

# Push to registry
docker push your-registry/daily-task-manager-backend:latest
```

#### 2. Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    image: your-registry/daily-task-manager-backend:latest
    container_name: task-manager-backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - FRONTEND_URL=${FRONTEND_URL}
    depends_on:
      - postgres
    networks:
      - task-manager-network
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    container_name: task-manager-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    networks:
      - task-manager-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: task-manager-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    networks:
      - task-manager-network

volumes:
  postgres_data:

networks:
  task-manager-network:
    driver: bridge
```

#### 3. Deploy with Docker Compose

```bash
# Create production environment file
cp .env.example .env.production
# Edit .env.production with production values

# Deploy
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Option 2: Kubernetes Deployment

#### 1. Create Kubernetes Manifests

**namespace.yaml**:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: task-manager
```

**secret.yaml**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: task-manager-secrets
  namespace: task-manager
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:password@postgres:5432/task_manager"
  JWT_SECRET: "your-jwt-secret"
  SESSION_SECRET: "your-session-secret"
  GOOGLE_CLIENT_ID: "your-google-client-id"
  GOOGLE_CLIENT_SECRET: "your-google-client-secret"
```

**deployment.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-manager-backend
  namespace: task-manager
spec:
  replicas: 3
  selector:
    matchLabels:
      app: task-manager-backend
  template:
    metadata:
      labels:
        app: task-manager-backend
    spec:
      containers:
      - name: backend
        image: your-registry/daily-task-manager-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3001"
        - name: FRONTEND_URL
          value: "https://app.daily-task-manager.com"
        envFrom:
        - secretRef:
            name: task-manager-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

**service.yaml**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: task-manager-backend-service
  namespace: task-manager
spec:
  selector:
    app: task-manager-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: ClusterIP
```

#### 2. Deploy to Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployment
kubectl get pods -n task-manager
kubectl logs -f deployment/task-manager-backend -n task-manager
```

### Option 3: Cloud Platform Deployment

#### AWS ECS with Fargate

1. **Create Task Definition**:
```json
{
  "family": "task-manager-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "your-registry/daily-task-manager-backend:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:task-manager/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/task-manager-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

2. **Deploy with AWS CLI**:
```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Update service
aws ecs update-service --cluster task-manager-cluster --service task-manager-backend --task-definition task-manager-backend:latest
```

## 🔒 Security Configuration

### 1. SSL/TLS Certificate Setup

#### Let's Encrypt with Certbot:
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.daily-task-manager.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Nginx Configuration

Create `nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server app:3001;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        listen 80;
        server_name api.daily-task-manager.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.daily-task-manager.com;

        # SSL configuration
        ssl_certificate /etc/ssl/certs/fullchain.pem;
        ssl_certificate_key /etc/ssl/certs/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Rate limiting
        limit_req zone=api burst=20 nodelay;

        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        location /health {
            proxy_pass http://backend/health;
            access_log off;
        }
    }
}
```

## 📊 Monitoring and Logging

### 1. Application Monitoring

#### Health Check Endpoint:
```bash
# Basic health check
curl https://api.daily-task-manager.com/health

# Detailed health check (if implemented)
curl https://api.daily-task-manager.com/health/detailed
```

#### Monitoring with Prometheus:
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'task-manager-backend'
    static_configs:
      - targets: ['app:3001']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### 2. Logging Configuration

#### Structured Logging:
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

## 🔄 Database Migration

### 1. Production Migration Strategy

```bash
# 1. Backup current database
pg_dump -h localhost -U username -d database_name > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migrations
npm run migrate

# 3. Verify migration
npm run migrate:status

# 4. Rollback if needed
npm run migrate:rollback
```

### 2. Zero-Downtime Deployment

1. **Blue-Green Deployment**:
   - Deploy to new environment (Green)
   - Run health checks
   - Switch traffic from Blue to Green
   - Keep Blue as backup

2. **Rolling Updates** (Kubernetes):
   ```bash
   kubectl rollout status deployment/task-manager-backend -n task-manager
   kubectl rollout history deployment/task-manager-backend -n task-manager
   kubectl rollout undo deployment/task-manager-backend -n task-manager
   ```

## 🚨 Disaster Recovery

### 1. Backup Strategy

```bash
#!/bin/bash
# backup-script.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="daily_task_manager"

# Database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Application data backup
tar -czf $BACKUP_DIR/app_data_$DATE.tar.gz /app/data

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql.gz s3://your-backup-bucket/
aws s3 cp $BACKUP_DIR/app_data_$DATE.tar.gz s3://your-backup-bucket/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

### 2. Recovery Procedures

```bash
# Restore database
gunzip -c backup_20250120_120000.sql.gz | psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Restore application data
tar -xzf app_data_20250120_120000.tar.gz -C /

# Restart services
docker-compose restart
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] SSL certificates installed
- [ ] Security headers configured
- [ ] Monitoring setup
- [ ] Backup procedures tested

### Deployment
- [ ] Build and test Docker image
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Verify health checks
- [ ] Monitor logs and metrics

### Post-Deployment
- [ ] Verify all endpoints working
- [ ] Check performance metrics
- [ ] Update monitoring dashboards
- [ ] Document any issues
- [ ] Notify stakeholders

---

**For additional help with deployment, please contact the DevOps team or create an issue in the repository.**