# Daily Task Manager Backend

[![CI Status](https://github.com/your-username/daily-task-manager-backend/workflows/Continuous%20Integration/badge.svg)](https://github.com/your-username/daily-task-manager-backend/actions/workflows/ci.yml)
[![Deploy Status](https://github.com/your-username/daily-task-manager-backend/workflows/Deploy%20to%20Production/badge.svg)](https://github.com/your-username/daily-task-manager-backend/actions/workflows/deploy.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=daily-task-manager-backend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=daily-task-manager-backend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=daily-task-manager-backend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=daily-task-manager-backend)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=daily-task-manager-backend&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=daily-task-manager-backend)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=daily-task-manager-backend&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=daily-task-manager-backend)

Enterprise-grade Node.js + Express + TypeScript backend API for Daily Task Manager with Google OAuth authentication, PostgreSQL database, and comprehensive CI/CD pipeline.

## 🚀 Features

- **Modern Tech Stack**: Node.js 18+, Express 5, TypeScript 5.8
- **Authentication**: Google OAuth 2.0 + JWT tokens with Passport.js
- **Database**: PostgreSQL 15 with connection pooling and migrations
- **Security**: Helmet, CORS, rate limiting, input validation, and security auditing
- **Testing**: Comprehensive test suite with Jest and Supertest
- **Code Quality**: ESLint, Prettier, SonarCloud integration
- **CI/CD**: Automated testing, building, security scanning, and deployment
- **Containerization**: Docker support with multi-stage builds
- **Monitoring**: Health checks, logging, and performance metrics
- **Documentation**: Comprehensive API documentation and code comments

## 📋 Prerequisites

- **Node.js** 18.x or later
- **PostgreSQL** 15.x or later
- **Docker** (optional, for containerized development)
- **Google Cloud Console** account (for OAuth setup)

## 🛠️ Installation

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/daily-task-manager-backend.git
   cd daily-task-manager-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration values
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb daily_task_manager
   
   # Run migrations (if available)
   npm run migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### Docker Development Setup

1. **Using Docker Compose** (recommended)
   ```bash
   docker-compose up --build
   ```

2. **Using Docker only**
   ```bash
   # Build image
   npm run docker:build
   
   # Run container
   npm run docker:run
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Application environment | Yes | `development` |
| `PORT` | Server port | No | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `SESSION_SECRET` | Session signing secret | Yes | - |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes | - |
| `FRONTEND_URL` | Frontend application URL | No | `http://localhost:5173` |

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Set authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
6. Update `.env` file with client ID and secret

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/auth/google` | Initiate Google OAuth | No |
| `GET` | `/api/auth/google/callback` | OAuth callback | No |
| `POST` | `/api/auth/verify` | Verify JWT token | No |
| `GET` | `/api/auth/profile` | Get user profile | Yes |

### Task Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/tasks` | Get all user tasks | Yes |
| `GET` | `/api/tasks/today` | Get today's tasks | Yes |
| `GET` | `/api/tasks/old` | Get overdue tasks | Yes |
| `POST` | `/api/tasks` | Create new task | Yes |
| `PATCH` | `/api/tasks/:id/toggle` | Toggle task completion | Yes |
| `PUT` | `/api/tasks/:id` | Update task | Yes |
| `DELETE` | `/api/tasks/:id` | Delete task | Yes |

### Health Check

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/health` | System health status | No |

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

### Test Structure

```
src/__tests__/
├── setup.ts                 # Test configuration
├── health.test.ts           # Health endpoint tests
├── controllers/             # Controller tests
│   ├── taskController.test.ts
│   └── authController.test.ts
├── middleware/              # Middleware tests
│   ├── auth.test.ts
│   └── validation.test.ts
└── models/                  # Model tests
    ├── Task.test.ts
    └── User.test.ts
```

## 🏗️ Development

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Code formatting
npm run format
npm run format:check

# Full CI check
npm run ci
```

### Project Structure

```
src/
├── config/          # Configuration files
│   ├── database.ts  # Database connection
│   └── passport.ts  # Passport configuration
├── controllers/     # Route handlers
├── middleware/      # Express middleware
├── models/          # Data models
├── routes/          # API routes
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Application entry point
```

### Architecture Principles

- **Clean Architecture**: Separation of concerns with clear boundaries
- **Repository Pattern**: Data access abstraction
- **Dependency Injection**: Testable and modular code
- **Error Handling**: Comprehensive error management
- **Security First**: Defense in depth approach
- **Type Safety**: Full TypeScript coverage

## 🚢 Deployment

### CI/CD Pipeline

The project includes comprehensive GitHub Actions workflows:

1. **Continuous Integration (`ci.yml`)**
   - TypeScript compilation and type checking
   - ESLint code quality checks
   - Jest test execution with coverage
   - Docker build validation
   - Security scanning with CodeQL
   - Database migration testing

2. **Deployment (`deploy.yml`)**
   - Docker image building and pushing
   - Staging deployment
   - Production deployment with approval
   - Rollback capability

3. **Code Quality (`quality.yml`)**
   - SonarCloud analysis
   - Performance benchmarking
   - Bundle size analysis
   - Weekly quality reports

4. **Dependency Management (`dependency-update.yml`)**
   - Automated security audits
   - Dependency update PRs
   - Vulnerability notifications

### Environment Setup

#### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `SONAR_TOKEN` | SonarCloud authentication token |
| `DOCKER_REGISTRY_TOKEN` | Container registry access token |
| `STAGING_DEPLOY_KEY` | Staging environment deployment key |
| `PRODUCTION_DEPLOY_KEY` | Production environment deployment key |

#### Branch Protection Rules

- Require status checks to pass before merging
- Require branches to be up to date before merging
- Require review from code owners
- Restrict pushes to matching branches
- Require signed commits (recommended)

## 📊 Monitoring & Observability

### Health Checks

The application includes comprehensive health checks:

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "success": true,
  "message": "Daily Task Manager API is running",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "environment": "production"
}
```

### Logging

- **Morgan**: HTTP request logging
- **Console**: Application logging with levels
- **Error Tracking**: Unhandled rejection and exception handling

### Performance Monitoring

- Database connection pooling metrics
- Request/response time tracking
- Memory usage monitoring
- Error rate tracking

## 🔒 Security

### Implemented Security Measures

- **Authentication**: Google OAuth 2.0 + JWT
- **Authorization**: Route-level access control
- **Input Validation**: Comprehensive request validation
- **Security Headers**: Helmet.js configuration
- **CORS**: Controlled cross-origin requests
- **Rate Limiting**: Request throttling
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization
- **Security Auditing**: Regular dependency scanning

### Security Best Practices

1. Keep dependencies updated
2. Use environment variables for secrets
3. Implement proper error handling
4. Regular security audits
5. Follow principle of least privilege
6. Use HTTPS in production
7. Implement proper session management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow conventional commit messages
- Ensure all CI checks pass

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/daily-task-manager-backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/daily-task-manager-backend/discussions)
- **Documentation**: [Wiki](https://github.com/your-username/daily-task-manager-backend/wiki)

## 🎯 Roadmap

- [ ] GraphQL API implementation
- [ ] Real-time notifications with WebSockets
- [ ] Advanced task analytics
- [ ] Multi-tenant support
- [ ] Mobile app API extensions
- [ ] Advanced caching with Redis
- [ ] Microservices architecture migration

---

**Built with ❤️ by the Daily Task Manager Team**