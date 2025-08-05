# GitHub Repository Setup Guide

This guide covers the complete setup of GitHub repository settings, branch protection rules, and CI/CD configuration for the Daily Task Manager Backend.

## 🏗️ Repository Creation

### 1. Create Repository

```bash
# Option 1: Using GitHub CLI
gh repo create daily-task-manager-backend \
  --description "Enterprise-grade Node.js + Express + TypeScript backend API for Daily Task Manager" \
  --public \
  --add-readme

# Option 2: Using GitHub Web Interface
# 1. Go to https://github.com/new
# 2. Set repository name: daily-task-manager-backend
# 3. Add description
# 4. Choose public/private
# 5. Initialize with README
```

### 2. Initial Repository Setup

```bash
# Clone repository
git clone https://github.com/your-username/daily-task-manager-backend.git
cd daily-task-manager-backend

# Add all backend files
cp -r /path/to/backend/files/* .

# Initial commit
git add .
git commit -m "feat: initial backend setup with comprehensive CI/CD pipeline

- Add Node.js + Express + TypeScript backend structure
- Implement Google OAuth authentication with Passport.js
- Add PostgreSQL database integration
- Set up comprehensive GitHub Actions workflows
- Add ESLint, Prettier, and Jest configurations
- Include Docker containerization
- Add security configurations and documentation

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main
```

## 🔒 Repository Settings Configuration

### 1. General Settings

Navigate to **Settings > General**:

#### Repository Details
- **Description**: "Enterprise-grade Node.js + Express + TypeScript backend API for Daily Task Manager with Google OAuth authentication, PostgreSQL database, and comprehensive CI/CD pipeline"
- **Website**: `https://api.daily-task-manager.com` (if applicable)
- **Topics**: `nodejs`, `express`, `typescript`, `postgresql`, `oauth`, `jwt`, `docker`, `api`, `backend`, `task-manager`

#### Features
- [x] Wikis
- [x] Issues
- [x] Sponsorships
- [x] Preserve this repository
- [x] Discussions

#### Pull Requests
- [x] Allow merge commits
- [x] Allow squash merging
- [x] Allow rebase merging
- [x] Always suggest updating pull request branches
- [x] Automatically delete head branches

### 2. Security Settings

Navigate to **Settings > Security**:

#### Private Vulnerability Reporting
- [x] Enable private vulnerability reporting

#### Dependency Graph
- [x] Enable dependency graph

#### Dependabot
- [x] Enable Dependabot alerts
- [x] Enable Dependabot security updates

Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  # Enable version updates for npm
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 10
    reviewers:
      - "your-username"
    assignees:
      - "your-username"
    commit-message:
      prefix: "chore"
      include: "scope"
    labels:
      - "dependencies"
      - "automated"

  # Enable version updates for GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    reviewers:
      - "your-username"
    commit-message:
      prefix: "ci"
      include: "scope"
    labels:
      - "github-actions"
      - "automated"

  # Enable version updates for Docker
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    reviewers:
      - "your-username"
    commit-message:
      prefix: "docker"
      include: "scope"
    labels:
      - "docker"
      - "automated"
```

## 🛡️ Branch Protection Rules

### 1. Main Branch Protection

Navigate to **Settings > Branches > Add rule**:

#### Branch Name Pattern
- `main`

#### Protection Rules
- [x] **Require a pull request before merging**
  - [x] Require approvals: **2**
  - [x] Dismiss stale reviews when new commits are pushed
  - [x] Require review from code owners
  - [x] Restrict pushes that create files larger than 100 MB

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - **Required status checks**:
    - `CI Success` (from ci.yml workflow)
    - `TypeScript Type Checking`
    - `Code Quality & Linting`
    - `Unit & Integration Tests`
    - `Docker Build Validation`
    - `Security Scanning`
    - `Database Migration Testing`

- [x] **Require conversation resolution before merging**

- [x] **Require signed commits**

- [x] **Require linear history**

- [x] **Restrict pushes that create files larger than 100 MB**

- [x] **Restrict who can push to matching branches**
  - **Restrict pushes**: Maintainers only
  - [x] Include administrators

### 2. Develop Branch Protection

Create protection rule for `develop` branch:

#### Branch Name Pattern
- `develop`

#### Protection Rules
- [x] **Require a pull request before merging**
  - [x] Require approvals: **1**
  - [x] Dismiss stale reviews when new commits are pushed

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - **Required status checks**:
    - `CI Success`

- [x] **Require conversation resolution before merging**

## 🔐 Repository Secrets

Navigate to **Settings > Secrets and variables > Actions**:

### Required Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `SONAR_TOKEN` | SonarCloud authentication token | [SonarCloud Account Settings](https://sonarcloud.io/account/security/) |
| `CODECOV_TOKEN` | Codecov upload token | [Codecov Repository Settings](https://codecov.io/) |
| `NPM_TOKEN` | NPM registry token (if publishing) | [NPM Access Tokens](https://www.npmjs.com/settings/tokens) |
| `DOCKER_USERNAME` | Docker Hub username | Docker Hub account |
| `DOCKER_PASSWORD` | Docker Hub password/token | Docker Hub account |

### Environment Variables

| Variable Name | Description | Example Value |
|---------------|-------------|---------------|
| `NODE_VERSION` | Node.js version for CI | `18.x` |
| `POSTGRES_VERSION` | PostgreSQL version for testing | `15` |

### Setting up Secrets

```bash
# Using GitHub CLI
gh secret set SONAR_TOKEN --body "your-sonar-token"
gh secret set CODECOV_TOKEN --body "your-codecov-token"

# Or through GitHub web interface:
# Settings > Secrets and variables > Actions > New repository secret
```

## 📋 Issue and PR Templates

### 1. Issue Templates

Create `.github/ISSUE_TEMPLATE/bug_report.yml`:
```yaml
name: Bug Report
description: File a bug report to help us improve
title: "[BUG] "
labels: ["bug", "triage"]
assignees: []

body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!

  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Also tell us, what did you expect to happen?
      placeholder: Tell us what you see!
    validations:
      required: true

  - type: textarea
    id: reproduction-steps
    attributes:
      label: Reproduction Steps
      description: How do we reproduce this issue?
      placeholder: |
        1. Go to '...'
        2. Click on '....'
        3. Scroll down to '....'
        4. See error
    validations:
      required: true

  - type: textarea
    id: logs
    attributes:
      label: Relevant log output
      description: Please copy and paste any relevant log output. This will be automatically formatted into code, so no need for backticks.
      render: shell

  - type: dropdown
    id: environment
    attributes:
      label: Environment
      description: What environment are you running?
      options:
        - Development
        - Staging
        - Production
    validations:
      required: true

  - type: input
    id: node-version
    attributes:
      label: Node.js Version
      placeholder: "18.17.0"
    validations:
      required: true
```

Create `.github/ISSUE_TEMPLATE/feature_request.yml`:
```yaml
name: Feature Request
description: Suggest an idea for this project
title: "[FEATURE] "
labels: ["enhancement", "triage"]
assignees: []

body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a new feature!

  - type: textarea
    id: problem
    attributes:
      label: Is your feature request related to a problem?
      description: A clear and concise description of what the problem is.
      placeholder: I'm always frustrated when...
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Describe the solution you'd like
      description: A clear and concise description of what you want to happen.
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Describe alternatives you've considered
      description: A clear and concise description of any alternative solutions or features you've considered.

  - type: textarea
    id: additional-context
    attributes:
      label: Additional context
      description: Add any other context or screenshots about the feature request here.
```

### 2. Pull Request Template

Create `.github/pull_request_template.md`:
```markdown
## Description

Brief description of the changes in this PR.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] This change requires a documentation update

## How Has This Been Tested?

Please describe the tests that you ran to verify your changes.

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Checklist

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules

## Screenshots (if applicable)

## Additional Notes

Any additional information that reviewers should know about this PR.
```

## 🏷️ Labels Configuration

Create comprehensive labels for issue and PR management:

```bash
# Using GitHub CLI to create labels

# Priority labels
gh label create "priority:critical" --color "d73a4a" --description "Critical priority"
gh label create "priority:high" --color "ff6b35" --description "High priority"
gh label create "priority:medium" --color "ffaa00" --description "Medium priority"
gh label create "priority:low" --color "0075ca" --description "Low priority"

# Type labels
gh label create "type:bug" --color "d73a4a" --description "Something isn't working"
gh label create "type:enhancement" --color "a2eeef" --description "New feature or request"
gh label create "type:documentation" --color "0075ca" --description "Improvements or additions to documentation"
gh label create "type:security" --color "d73a4a" --description "Security related issue"

# Status labels
gh label create "status:triage" --color "ffffff" --description "Needs triage"
gh label create "status:in-progress" --color "ffaa00" --description "Currently being worked on"
gh label create "status:blocked" --color "d73a4a" --description "Blocked by dependencies"
gh label create "status:ready-for-review" --color "0e8a16" --description "Ready for code review"

# Component labels
gh label create "component:auth" --color "c5def5" --description "Authentication related"
gh label create "component:database" --color "c5def5" --description "Database related"
gh label create "component:api" --color "c5def5" --description "API related"
gh label create "component:docker" --color "c5def5" --description "Docker related"
gh label create "component:ci-cd" --color "c5def5" --description "CI/CD pipeline related"

# Automated labels
gh label create "automated" --color "e99695" --description "Created by automation"
gh label create "dependencies" --color "0366d6" --description "Pull requests that update a dependency file"
```

## 🔍 Code Owners

Create `.github/CODEOWNERS`:
```bash
# Global owners
* @your-username @team-lead

# Backend specific
src/ @backend-team @your-username
*.ts @typescript-experts @your-username

# CI/CD pipeline
.github/ @devops-team @your-username
Dockerfile @devops-team
docker-compose.yml @devops-team

# Documentation
*.md @docs-team @your-username
docs/ @docs-team

# Security
SECURITY.md @security-team @your-username
*.security.* @security-team

# Database
*.sql @database-team @your-username
src/models/ @database-team @backend-team

# Configuration
*.json @your-username
*.yml @your-username
*.yaml @your-username
.env.* @your-username @devops-team
```

## 📊 Repository Insights Configuration

### 1. Enable Repository Insights

Navigate to **Insights** tab and configure:

- **Traffic**: Monitor repository traffic
- **Commits**: Track commit activity
- **Code frequency**: Monitor code changes
- **Dependency graph**: View dependencies
- **Network**: View repository network

### 2. Setup Repository Rules

Navigate to **Settings > Rules > Rulesets**:

Create ruleset for branch protection with additional rules:
- Restrict creation of branches
- Restrict deletion of branches
- Require signed commits
- Block force pushes

## 🎯 Project Management

### 1. GitHub Projects

Create a project board for tracking work:

1. Go to **Projects** tab
2. Create new project: "Daily Task Manager Backend Development"
3. Choose "Team planning" template
4. Configure columns:
   - Backlog
   - Ready
   - In Progress
   - In Review
   - Done

### 2. Milestones

Create milestones for tracking releases:

```bash
# Using GitHub CLI
gh milestone create "v1.0.0" --title "Initial Release" --description "First stable release with core features"
gh milestone create "v1.1.0" --title "Enhanced Features" --description "Additional features and improvements"
```

## ✅ Setup Verification Checklist

### Repository Configuration
- [ ] Repository created with proper description
- [ ] Topics and labels configured
- [ ] Branch protection rules enabled
- [ ] Required status checks configured
- [ ] Code owners file created

### CI/CD Pipeline
- [ ] GitHub Actions workflows configured
- [ ] Required secrets added
- [ ] Environment variables set
- [ ] SonarCloud integration setup
- [ ] Codecov integration setup

### Security Configuration
- [ ] Dependabot enabled
- [ ] Security policy created
- [ ] Private vulnerability reporting enabled
- [ ] Signed commits required

### Documentation
- [ ] README with badges created
- [ ] Contributing guide added
- [ ] Security policy documented
- [ ] Deployment guide created
- [ ] Issue and PR templates configured

### Testing & Quality
- [ ] Jest configuration setup
- [ ] ESLint and Prettier configured
- [ ] Test coverage reporting enabled
- [ ] Code quality gates configured

---

**This setup ensures a professional, secure, and maintainable repository with comprehensive CI/CD pipeline and development workflow.**