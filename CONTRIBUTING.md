# Contributing to Daily Task Manager Backend

Thank you for your interest in contributing to the Daily Task Manager Backend! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- PostgreSQL 15.x or later
- Docker (optional)
- Git
- GitHub account

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/daily-task-manager-backend.git
   cd daily-task-manager-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Configure your .env file
   ```

4. **Run tests to ensure everything works**
   ```bash
   npm test
   ```

## 📋 Development Workflow

### Branch Strategy

We use **Git Flow** branching strategy:

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Feature development branches
- `hotfix/*`: Critical bug fixes
- `release/*`: Release preparation branches

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm run ci  # Runs typecheck, lint, test, and build
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 Code Style Guidelines

### TypeScript Standards

- Use **strict TypeScript** configuration
- Prefer **interfaces** over types for object shapes
- Use **explicit return types** for functions
- Avoid `any` type; use proper typing
- Use **optional chaining** and **nullish coalescing** where appropriate

```typescript
// Good
interface User {
  id: string;
  email: string;
  name?: string;
}

async function getUser(id: string): Promise<User | null> {
  // Implementation
}

// Avoid
function getUser(id: any): any {
  // Implementation
}
```

### Code Organization

```typescript
// 1. External imports
import express from 'express';
import { Request, Response } from 'express';

// 2. Internal imports
import { UserModel } from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';

// 3. Types and interfaces
interface UserResponse {
  success: boolean;
  data?: User;
  message?: string;
}

// 4. Implementation
export const userController = {
  async getUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Implementation
  }
};
```

### Error Handling

Always implement comprehensive error handling:

```typescript
export const taskController = {
  async createTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const task = await TaskModel.create(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        data: task
      });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create task'
      });
    }
  }
};
```

### Security Best Practices

- **Always validate input** data
- **Sanitize** user inputs
- **Use parameterized queries** for database operations
- **Never log sensitive information**
- **Implement proper authentication checks**

```typescript
// Good - Input validation
const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high'])
});

export const validateCreateTask = (req: Request, res: Response, next: NextFunction) => {
  try {
    createTaskSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid input data' });
  }
};
```

## 🧪 Testing Guidelines

### Test Structure

```
src/__tests__/
├── setup.ts                    # Test configuration
├── unit/                       # Unit tests
│   ├── controllers/
│   ├── middleware/
│   └── models/
├── integration/                # Integration tests
│   ├── auth.test.ts
│   └── tasks.test.ts
└── e2e/                       # End-to-end tests
    └── api.test.ts
```

### Writing Tests

1. **Unit Tests**: Test individual functions/methods
2. **Integration Tests**: Test API endpoints
3. **E2E Tests**: Test complete user workflows

```typescript
describe('TaskController', () => {
  describe('getAllTasks', () => {
    it('should return tasks for authenticated user', async () => {
      // Arrange
      const mockTasks = [/* mock data */];
      jest.spyOn(TaskModel, 'findAll').mockResolvedValue(mockTasks);
      
      // Act
      await taskController.getAllTasks(mockRequest, mockResponse);
      
      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTasks,
        count: mockTasks.length
      });
    });
  });
});
```

### Test Requirements

- **Minimum 80% code coverage**
- **Test both success and error scenarios**
- **Mock external dependencies**
- **Use descriptive test names**
- **Follow AAA pattern** (Arrange, Act, Assert)

## 📋 Pull Request Guidelines

### PR Checklist

Before submitting a PR, ensure:

- [ ] Code follows style guidelines
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] Commit messages follow conventional format
- [ ] No linting errors
- [ ] TypeScript compilation succeeds
- [ ] All CI checks pass

### PR Template

```markdown
## Description
Brief description of the changes.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] This change requires a documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Conventional Commits

Use conventional commit format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

**Examples:**
```bash
feat(auth): add Google OAuth integration
fix(tasks): resolve task completion toggle issue
docs(api): update endpoint documentation
test(controllers): add task controller tests
```

## 🔍 Code Review Process

### Review Criteria

Reviewers will check for:

1. **Functionality**: Does the code work as intended?
2. **Code Quality**: Is the code clean, readable, and maintainable?
3. **Performance**: Are there any performance implications?
4. **Security**: Are there any security vulnerabilities?
5. **Testing**: Are adequate tests included?
6. **Documentation**: Is documentation updated and clear?

### Review Timeline

- **Initial Review**: Within 2 business days
- **Follow-up Reviews**: Within 1 business day
- **Approval**: Requires 2 approvals for main branch

## 🐛 Reporting Issues

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Environment:**
 - OS: [e.g. Ubuntu 20.04]
 - Node.js version: [e.g. 18.17.0]
 - Database: [e.g. PostgreSQL 15.3]

**Additional context**
Add any other context about the problem here.
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## 🏆 Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- GitHub contributors graph
- Annual contributor appreciation

## 📚 Resources

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

## ❓ Questions?

- **GitHub Discussions**: [Project Discussions](https://github.com/your-username/daily-task-manager-backend/discussions)
- **Issues**: [GitHub Issues](https://github.com/your-username/daily-task-manager-backend/issues)
- **Email**: [project-maintainers@example.com](mailto:project-maintainers@example.com)

Thank you for contributing to Daily Task Manager Backend! 🎉