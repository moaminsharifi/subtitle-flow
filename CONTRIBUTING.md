# Contributing to Subtitle Flow

First off, thank you for considering contributing to Subtitle Flow! 🎉 

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [How to Contribute](#how-to-contribute)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- **Be respectful**: Treat everyone with respect. No harassment, discrimination, or inappropriate behavior.
- **Be collaborative**: Work together towards common goals.
- **Be patient**: Remember that everyone was new once.
- **Be constructive**: Provide helpful feedback and accept criticism gracefully.

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- Git installed
- A GitHub account
- Basic knowledge of JavaScript/TypeScript
- Familiarity with your chosen framework (React/Vue/Svelte)

### Setting Up Your Development Environment

1. **Fork the repository**
   ```bash
   # Click the 'Fork' button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/subtitle-sync.git
   cd subtitle-sync
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/subtitle-sync.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

5. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

## Development Process

We use GitHub Flow, so all changes happen through pull requests:

1. Fork the repo and create your branch from `main`
2. Make your changes
3. Write or update tests if needed
4. Ensure the test suite passes
5. Update documentation if needed
6. Issue a pull request

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/add-webvtt-export`)
- `fix/` - Bug fixes (e.g., `fix/subtitle-timing-issue`)
- `docs/` - Documentation updates (e.g., `docs/update-readme`)
- `refactor/` - Code refactoring (e.g., `refactor/optimize-parser`)
- `test/` - Test additions or fixes (e.g., `test/add-player-tests`)

## How to Contribute

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**When reporting a bug, include:**

1. **Clear title and description**
2. **Steps to reproduce**
   - List the exact steps
   - Include sample files if applicable
   - Specify browser and OS
3. **Expected behavior**
4. **Actual behavior**
5. **Screenshots** (if applicable)
6. **Browser console errors** (if any)

**Bug Report Template:**
```markdown
## Description
Brief description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Upload file '...'
4. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- Subtitle Flow Version: [e.g., 1.2.0]

## Additional Context
Any other relevant information
```

### 💡 Suggesting Features

We love feature suggestions! Before creating a feature request:

1. Check if it's already suggested
2. Check if it's already in development
3. Consider if it aligns with the project's goals

**Feature Request Template:**
```markdown
## Feature Description
Clear and concise description

## Problem it Solves
What problem does this feature address?

## Proposed Solution
How should it work?

## Alternatives Considered
Other solutions you've thought about

## Additional Context
Mockups, examples, or references
```

### 🔧 Submitting Code

#### Before You Start Coding

1. **Check existing issues** - Someone might already be working on it
2. **Discuss major changes** - Open an issue first for significant changes
3. **Keep changes focused** - One feature/fix per pull request

#### Writing Code

Follow these guidelines:

- **Write clean, readable code**
- **Follow existing code style**
- **Comment complex logic**
- **Add tests for new features**
- **Update documentation**

#### Code Quality Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex parts
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] No console errors
- [ ] Works in all supported browsers

## Pull Request Process

1. **Update your fork**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Rebase your feature branch**
   ```bash
   git checkout feature/your-feature
   git rebase main
   ```

3. **Push your changes**
   ```bash
   git push origin feature/your-feature
   ```

4. **Create Pull Request**
   - Use a clear, descriptive title
   - Reference related issues
   - Describe your changes
   - Include screenshots for UI changes

**Pull Request Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123

## Testing
- [ ] Tested in Chrome
- [ ] Tested in Firefox
- [ ] Tested in Safari
- [ ] Tested in Edge

## Checklist
- [ ] My code follows the project style
- [ ] I've performed self-review
- [ ] I've commented my code where needed
- [ ] I've updated documentation
- [ ] My changes generate no warnings
- [ ] I've added tests
- [ ] All tests pass
```

## Style Guidelines

### JavaScript/TypeScript

```javascript
// Use meaningful variable names
const subtitleDuration = endTime - startTime; // ✅
const d = e - s; // ❌

// Use async/await over promises
async function loadSubtitles() {
  try {
    const data = await fetchSubtitles();
    return parseSubtitles(data);
  } catch (error) {
    console.error('Failed to load subtitles:', error);
  }
}

// Document complex functions
/**
 * Converts subtitle time format to milliseconds
 * @param {string} time - Time in format "00:00:00,000"
 * @returns {number} Time in milliseconds
 */
function timeToMs(time) {
  // Implementation
}
```

### CSS/Styling

- Use CSS modules or styled-components
- Follow BEM naming convention for classes
- Ensure responsive design
- Support both dark and light themes

### Git Commits

Write clear, concise commit messages:

```
feat: add keyboard shortcuts for subtitle navigation
fix: resolve timing drift in long videos
docs: update API configuration guide
style: improve mobile layout for editor
refactor: optimize subtitle parsing performance
test: add tests for VTT export functionality
```

Format: `<type>: <subject>`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- subtitle-parser.test.js

# Check code coverage
npm run test:coverage
```

### Writing Tests

- Write tests for new features
- Update tests when modifying existing features
- Aim for high code coverage
- Test edge cases

Example:
```javascript
describe('SubtitleParser', () => {
  test('should parse valid SRT format', () => {
    const srt = '1\n00:00:00,000 --> 00:00:05,000\nHello World';
    const result = parseSRT(srt);
    expect(result[0].text).toBe('Hello World');
    expect(result[0].startTime).toBe(0);
    expect(result[0].endTime).toBe(5000);
  });

  test('should handle empty input', () => {
    expect(parseSRT('')).toEqual([]);
  });
});
```

## Documentation

### Code Documentation

- Document all public APIs
- Include JSDoc comments for functions
- Add inline comments for complex logic
- Keep README up to date

### User Documentation

- Update user guides for new features
- Include screenshots for UI changes
- Document keyboard shortcuts
- Add troubleshooting tips

## Community

### Getting Help

- 🐛 [Issue Tracker](https://github.com/moaminsharifi/subtitle-sync/issues) - Bug reports and features
- 📧 Email: moaminsharifi@duck.com

### Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Project website

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Subtitle Flow! Your efforts help make subtitle editing accessible to everyone. 🙏

If you have questions, don't hesitate to ask. We're here to help!

