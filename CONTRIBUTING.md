# 🤝 Contributing to Sekolahku

Thank you for your interest in contributing to Sekolahku! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

---

## Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/sekolahku.git
   cd sekolahku/backend
   ```

2. **Set up development environment**
   ```bash
   npm install
   npm run setup  # Interactive setup wizard
   npm run migrate
   npm run dev
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   git checkout -b fix/my-bugfix
   ```

---

## Development Setup

### Requirements
- Node.js 16+
- MySQL 8.0+
- Git

### Environment
```bash
# Use the setup wizard
npm run setup

# Or copy template and edit manually
cp .env.example .env
nano .env
```

### Running Tests
```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm run test:coverage      # Coverage report
```

### Running Migrations
```bash
npm run migrate             # Apply pending migrations
npm run migrate:down        # Rollback last migration
```

---

## Code Standards

### JavaScript/Node.js
- Use ES6+ syntax
- 2-space indentation
- No semicolons at end of line (optional but recommended)
- Use `const` and `let`, avoid `var`
- Keep functions small and focused

### Naming Conventions
- **Variables/Functions**: `camelCase`
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: `kebab-case.js` for routes, `camelCase.js` for others

### Folder Organization
```
Feature/
├── controller.js      # Request handlers
├── service.js         # Business logic
├── model.js           # Database queries
├── routes.js          # Express routes
└── index.js           # Module exports
```

### Example Module Structure
```javascript
// controller.js
async function create(req, res, next) {
  try {
    const data = await service.create(req.body);
    return successResponse(res, data, 'Created successfully', 201);
  } catch (error) {
    return next(error);
  }
}

module.exports = { create };

// service.js
async function create(data) {
  const validated = validate(createSchema, data);
  if (!validated.success) {
    throw createError('Validation failed', 400, validated.errors);
  }
  return model.create(validated.data);
}

module.exports = { create };

// model.js
async function create(data) {
  const id = crypto.randomUUID();
  await pool.query('INSERT INTO table (id, ...) VALUES (?, ...)', [id, ...]);
  return id;
}

module.exports = { create };
```

### Validation
Always validate input using Zod schemas:
```javascript
const { validate } = require('./utils/validate');
const { createUserSchema } = require('./validations');

async function create(req, res, next) {
  const validated = validate(createUserSchema, req.body);
  if (!validated.success) {
    return errorResponse(res, 'Validation failed', validated.errors, 400);
  }
  // Process validated.data
}
```

### Error Handling
```javascript
// Create custom error
const error = new Error('Something went wrong');
error.statusCode = 400;
error.code = ErrorCode.VALIDATION_ERROR;
throw error;

// Or use error factory
throw createError('Invalid input', 422, { field: 'message' });
```

### Logging
```javascript
// Only in critical paths
console.log('[INFO]', 'Something important');
console.error('[ERROR]', error.message);

// Better: use structured logging (future)
logger.info('Something important', { userId: '123' });
```

---

## Submitting Changes

### Commit Messages
```bash
# Good commit messages
git commit -m "fix: correct typo in auth validation"
git commit -m "feat: add pagination to siswa list endpoint"
git commit -m "refactor: simplify error handler middleware"
git commit -m "docs: update setup instructions"

# Format: type(scope): short description
# Types: feat, fix, refactor, docs, test, chore, perf
```

### Before Submitting PR
1. ✅ Code runs locally without errors
2. ✅ All tests pass: `npm test`
3. ✅ No linting errors: `npm run lint`
4. ✅ No secrets in code (check `.env` not committed)
5. ✅ Database migrations tested
6. ✅ Updated documentation if needed

### Pull Request
1. **Title**: Clear and descriptive
   ```
   feat: add email notification for new registrations
   fix: resolve JWT token validation bug
   ```

2. **Description**: Include
   - What changes were made
   - Why they were needed
   - How to test the changes
   - Any breaking changes

3. **Tests**: Include test coverage if applicable

### Example PR Description
```markdown
## Description
Adds email notifications when new students register in the system.

## Changes
- New `notification/email` module
- Updated `registrasi` service to trigger notifications
- Added SMTP configuration support

## Testing
```bash
npm test -- notification
npm run migrate
npm run dev
# Then register a new student - check email
```

## Checklist
- [x] Code follows project standards
- [x] Tests added/updated
- [x] Documentation updated
- [x] No secrets in code
```

---

## Reporting Bugs

### Before Reporting
- Check existing issues
- Verify the issue still exists on latest code
- Try to reproduce the issue consistently

### Bug Report Template
```markdown
## Description
A clear description of what the bug is.

## Steps to Reproduce
1. Do this
2. Then do that
3. Bug appears

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: Windows 11
- Node: 18.x
- MySQL: 8.0
- Branch: main

## Screenshots
If applicable

## Error Log
```
Error message here
Stack trace if available
```
```

---

## Feature Requests

### Submission
Describe your feature:
- **Use Case**: What problem does this solve?
- **Implementation**: How would you implement it?
- **API Example**: Show expected API usage
- **Database Changes**: Any schema changes needed?

### Feature Request Template
```markdown
## Description
Brief description of the feature

## Use Case
Why is this feature needed?

## Proposed API
```javascript
// Example usage
POST /api/v1/notifications/send
{
  "user_id": "xxx",
  "template": "welcome",
  "data": { "name": "John" }
}
```

## Database Changes
- New table: `notification_templates`
- New column: `users.notification_preferences`

## Acceptance Criteria
- [ ] Feature works as described
- [ ] Tests are included
- [ ] Documentation is updated
```

---

## Code Review Process

1. **Reviewer Checklist**
   - Code quality and standards
   - Test coverage
   - Performance impact
   - Security implications
   - Documentation

2. **Changes Requested**
   - Make requested changes
   - Commit with message: `fix: address review comments`
   - Push changes (don't force push)

3. **Approval & Merge**
   - Once approved, maintainer will merge
   - Delete your feature branch

---

## Community

- **Slack**: [Join our Slack channel]
- **Discord**: [Join our Discord server]
- **Email**: dev@sekolahku.local
- **GitHub Discussions**: [Link to discussions]

---

## Additional Resources

- [SETUP.md](./SETUP.md) - Development environment setup
- [Architecture Guide](./docs/architecture.md) - System design
- [API Documentation](./docs/api.md) - API reference
- [Database Schema](./docs/database.md) - Database structure

---

## Questions?

Feel free to ask questions by:
- Opening a GitHub issue with `[QUESTION]` prefix
- Checking existing documentation
- Reaching out to maintainers

Thank you for contributing! 🎉
