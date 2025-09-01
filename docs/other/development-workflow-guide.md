# Roo Code Development Workflow Guide

## Overview

Roo Code is a sophisticated VSCode extension built as a monorepo using modern development tools and practices. This guide covers the complete development workflow, tooling setup, and best practices for contributors.

## Project Architecture

### Monorepo Structure
```
├── src/                    # Main VSCode extension source code
├── webview-ui/            # React-based webview UI
├── apps/                  # Applications
│   ├── vscode-e2e/       # End-to-end tests
│   ├── vscode-nightly/   # Nightly build configuration
│   ├── web-docs/         # Documentation website
│   ├── web-evals/        # Evaluation tools
│   └── web-roo-code/     # Marketing website
├── packages/             # Shared packages
│   ├── cloud/           # Cloud services
│   ├── config-eslint/   # ESLint configuration
│   ├── config-typescript/ # TypeScript configuration
│   ├── evals/           # Evaluation framework
│   ├── ipc/             # Inter-process communication
│   ├── telemetry/       # Telemetry utilities
│   └── types/           # Shared TypeScript types
├── locales/             # Internationalization files
└── scripts/             # Development utilities
```

### Package Manager
- **PNPM 10.8.1** is the required package manager
- Workspace configuration in `pnpm-workspace.yaml`
- Includes `src`, `webview-ui`, `apps/*`, and `packages/*`

## 1. Getting Started / Setup Process

### Prerequisites
- Node.js (version specified in `.nvmrc`)
- PNPM 10.8.1
- Python (for debug helper functionality)

### Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd roo-code

# Install dependencies (runs bootstrap script automatically)
pnpm install

# Alternative explicit install
pnpm install:all
```

### Bootstrap Process
The `scripts/bootstrap.mjs` script handles:
- Dependency installation across all workspaces
- Initial setup and configuration
- Workspace linking

## 2. Development Commands and Scripts

### Root Level Commands (via Turbo)
```bash
# Linting
pnpm lint                 # Run linting across all packages
pnpm format              # Format code across all packages

# Type Checking
pnpm check-types         # TypeScript type checking

# Testing
pnpm test               # Run all tests across packages

# Building
pnpm build              # Build all packages
pnpm bundle             # Bundle for production
pnpm bundle:nightly     # Bundle nightly version

# VSCode Extension Packaging
pnpm vsix               # Create VSIX package
pnpm vsix:nightly       # Create nightly VSIX package
pnpm install:vsix       # Install VSIX locally

# Cleanup
pnpm clean              # Clean all build artifacts
```

### Webview UI Development
```bash
cd webview-ui

# Development server
pnpm dev                # Start Vite dev server

# Building
pnpm build              # Production build
pnpm build:nightly      # Nightly build

# Testing
pnpm test               # Run vitest tests
pnpm pretest            # Build dependencies before testing
```

### Utility Scripts
```bash
# Internationalization
node scripts/find-missing-translations.js    # Check translation completeness
node scripts/find-missing-i18n-key.js       # Find missing i18n keys

# Contributors
pnpm update-contributors                     # Update contributors list

# Package Management
pnpm link-workspace-packages               # Link workspace packages
pnpm unlink-workspace-packages             # Unlink workspace packages

# Publishing
pnpm npm:publish:types                     # Publish types package
```

## 3. Testing Workflow

### Test Framework
- **Vitest** for unit and integration tests
- **@testing-library/react** for React component testing
- **jsdom** environment for browser simulation

### Test Configuration
- Root config: `vitest.config.ts`
- Setup file: `vitest.setup.ts`
- VSCode mocking: `src/__mocks__/vscode.ts`

### Running Tests
```bash
# All tests
pnpm test

# Specific workspace tests
cd src && npx vitest run path/to/test-file
cd webview-ui && npx vitest run src/path/to/test-file

# Watch mode
npx vitest

# UI mode
npx vitest --ui
```

### Test Rules
- Tests must be run from the correct workspace directory
- Backend tests: `cd src && npx vitest run tests/user.test.ts`
- UI tests: `cd webview-ui && npx vitest run src/path/to/test-file`
- All code changes require test coverage
- Tests must pass before submission

## 4. Build and Deployment Process

### Build System
- **esbuild** for main extension bundling
- **Vite** for webview UI bundling
- **Turbo** for monorepo orchestration

### Build Targets
```bash
# Development builds
pnpm build

# Production builds
pnpm bundle

# Extension packaging
pnpm vsix                # Standard release
pnpm vsix:nightly        # Nightly release
```

### Asset Management
The build process handles:
- WASM files (tiktoken, tree-sitter)
- Internationalization files
- Debug helper Python files
- Static assets and icons

### Build Outputs
- `dist/` - Main extension bundle
- `out/` - Development output
- `bin/` - VSIX packages
- `webview-ui/dist/` - UI bundle

## 5. Code Quality Checks

### Linting
- **ESLint** with custom configuration
- Shared config: `@roo-code/config-eslint`
- **Prettier** for code formatting
- **lint-staged** for pre-commit formatting

### Type Checking
- **TypeScript 5.4.5**
- Shared config: `@roo-code/config-typescript`
- Strict type checking enabled

### Additional Tools
- **Knip** for unused code detection
- **Changeset** for version management
- **All Contributors** for contributor recognition

### Quality Commands
```bash
pnpm lint               # ESLint checking
pnpm format             # Prettier formatting
pnpm check-types        # TypeScript checking
pnpm knip               # Dead code analysis
```

## 6. Git Workflow with Hooks

### Branch Protection
- Direct commits to `main` are blocked
- Direct pushes to `main` are blocked
- All changes must go through pull requests

### Husky Git Hooks

#### Pre-commit Hook
```bash
# Runs automatically on commit
- Blocks commits to main branch
- Runs lint-staged (Prettier formatting)
- Runs linting across all packages
```

#### Pre-push Hook
```bash
# Runs automatically on push
- Blocks pushes to main branch
- Runs type checking
- Checks for changesets (version management)
```

### Changeset Workflow
```bash
# Create a changeset for your changes
pnpm changeset

# Version packages (automated in CI)
pnpm changeset:version
```

## 7. Monorepo Management with Turbo

### Turbo Configuration
Located in `turbo.json` with tasks:
- `lint`, `check-types`, `format` - Code quality
- `test` - Testing (depends on types build)
- `build` - Package building
- `clean` - Cleanup (no cache)
- `vsix` - Extension packaging

### Task Dependencies
```mermaid
graph TD
    A[test] --> B[@roo-code/types#build]
    C[vsix] --> D[^build]
    C[vsix] --> E[generate-root-assets]
    E --> F[esbuild.js]
    E --> G[i18n locales]
    E --> H[WASM files]
```

### Caching Strategy
- Turbo caches build outputs and test results
- Cache keys based on file inputs and dependencies
- Shared cache across team members (when configured)

### Parallel Execution
Turbo runs tasks in parallel when possible:
- Independent packages build simultaneously
- Tests run across multiple packages
- Linting and type checking parallelized

## 8. VSCode Extension Development Specifics

### Extension Structure
- Entry point: `src/extension.ts`
- Webview UI: React-based in `webview-ui/`
- Workers: `src/workers/` (e.g., token counting)

### Development Mode
```bash
# Watch mode for extension
pnpm generate-root-assets --watch

# Watch mode for webview
cd webview-ui && pnpm dev
```

### Extension Packaging
```bash
# Create VSIX for testing
pnpm vsix

# Install locally for testing
pnpm install:vsix

# Nightly builds
pnpm bundle:nightly
pnpm vsix:nightly
```

### VSCode Configuration
- Settings in `.vscode/settings.json`
- TypeScript auto-detection disabled
- Vitest workspace warnings disabled
- Python testing configured

## 9. Continuous Integration / Continuous Deployment

### GitHub Actions Workflows

#### Code QA (`code-qa.yml`)
Runs on every PR and main branch push:
```yaml
Jobs:
- check-translations     # Verify i18n completeness
- knip                  # Dead code detection
- compile               # Lint + type check
- unit-test             # Cross-platform testing (Ubuntu, Windows)
- integration-test      # E2E tests (requires API key)
- notify-slack-on-failure # Team notifications
```

#### Other Workflows
- `changeset-release.yml` - Automated releases
- `marketplace-publish.yml` - VSCode Marketplace publishing
- `nightly-publish.yml` - Nightly builds
- `evals.yml` - Evaluation system
- `website-deploy.yml` - Documentation deployment

### CI/CD Best Practices
- All tests must pass before merge
- Cross-platform testing (Ubuntu, Windows)
- Integration tests with real API calls
- Automated version management with changesets
- Slack notifications for failures

## 10. Development Best Practices

### Code Organization
- Follow the established directory structure
- Use shared packages for common functionality
- Keep UI and extension logic separated
- Implement proper error handling

### Testing Guidelines
- Write tests for all new functionality
- Use appropriate test types (unit, integration, e2e)
- Mock external dependencies properly
- Maintain good test coverage

### Performance Considerations
- Use Turbo caching effectively
- Minimize bundle sizes
- Optimize WASM file loading
- Implement proper lazy loading

### Internationalization
- All user-facing strings must be internationalized
- Use the i18n system consistently
- Verify translation completeness before release
- Follow the established key naming conventions

### Version Management
- Use changesets for all changes
- Follow semantic versioning
- Document breaking changes clearly
- Coordinate releases across packages

## 11. Troubleshooting Common Issues

### Build Issues
```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build

# Check for dependency issues
pnpm install --frozen-lockfile
```

### Test Issues
```bash
# Run tests from correct directory
cd src && npx vitest run tests/file.test.ts
cd webview-ui && npx vitest run src/tests/file.test.ts

# Clear test cache
npx vitest run --no-cache
```

### Extension Development
```bash
# Rebuild extension assets
pnpm generate-root-assets

# Check VSCode logs
# Open VSCode Developer Tools
# Check extension host logs
```

### Workspace Issues
```bash
# Relink workspace packages
pnpm unlink-workspace-packages
pnpm link-workspace-packages

# Verify workspace configuration
cat pnpm-workspace.yaml
```

## 12. Contributing Guidelines

### Pull Request Process
1. Create feature branch from `main`
2. Make changes with appropriate tests
3. Run quality checks locally
4. Create changeset if needed
5. Submit pull request
6. Address review feedback
7. Ensure CI passes

### Code Review Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Changeset created (if needed)
- [ ] No lint/type errors
- [ ] Internationalization handled
- [ ] Performance impact considered

### Release Process
1. Changes merged to main
2. Changesets processed automatically
3. Version bumps applied
4. Packages published
5. Extension released to marketplace

This comprehensive guide should help developers understand and contribute effectively to the Roo Code project. The workflow emphasizes quality, automation, and developer experience while maintaining the complexity needed for a sophisticated VSCode extension.