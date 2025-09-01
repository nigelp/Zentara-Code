# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Zentara Code is a VS Code extension that serves as an AI-powered coding assistant with integrated runtime debugging capabilities. It's a fork of Roo-Code enhanced with Debug Adapter Protocol (DAP) debugging features.

## What you should do when there is an error:

When you see an error or when user ask you to resolve an error, debug a problem, always call ultra-debugger to help with debugging

## Development Commands

### Initial Setup

```bash
# Install pnpm globally if not already installed
npm install -g pnpm

# Install dependencies (uses pnpm workspaces)
pnpm install

# Install tsx globally for TypeScript debugging
npm install -g tsx
```

### Build Commands

```bash
# Build all packages in the monorepo
pnpm build

# Watch mode for development (builds webview, bundles extension, and watches TypeScript)
pnpm watch

# Bundle the extension only
cd src && pnpm bundle

# Package the extension into .vsix file
pnpm vsix
```

### Testing and Quality Commands

```bash
# Run all tests across the monorepo
pnpm test

# Run linting
pnpm lint

# Check TypeScript types
pnpm check-types

# Format code
pnpm format

# Run tests for a specific package
pnpm --filter @roo-code/[package-name] test
```

### Development Workflow

1. Use VS Code's "Run Extension" (F5) to launch a development instance
2. The `watch` task automatically rebuilds on file changes
3. For debugging the extension itself, use the launch configurations in `.vscode/launch.json`

## Architecture Overview

### Monorepo Structure

The project uses pnpm workspaces with Turbo for build orchestration:

- `/src` - Main VS Code extension code
- `/webview-ui` - React-based sidebar UI
- `/packages/*` - Shared packages (cloud, types, telemetry, ipc)
- `/apps/*` - Additional applications (nightly builds, web evals)

### Core Extension Architecture

#### AI Provider Integration (`/src/api`)

Zentara Code integrates with multiple AI providers through a unified interface:

- Each provider (Anthropic, OpenAI, Bedrock, etc.) implements the common API interface
- Streaming responses are handled uniformly across providers
- Authentication and configuration are managed per provider


#### Tool System (`/src/core/tools`)

Tools enable the AI to interact with the development environment:

- File operations (read, write, edit, search)
- Terminal command execution
- Browser automation
- MCP (Model Context Protocol) integration
- Debugging operations (31 specialized debug tools)




4. AI can perform sophisticated debugging operations like conditional breakpoints and expression evaluation

## Important Patterns

1. **Async/Await Everywhere**: All I/O operations use async patterns
2. **Event-Driven Architecture**: Debug events, file changes, and UI updates use EventEmitter
3. **Factory Pattern**: Used for creating provider instances and debug trackers
4. **Dependency Injection**: Core services are injected rather than imported directly
5. **State Management**: React Context for UI state, controller classes for extension state

## Testing Strategy

- Unit tests use Vitest with mocks for VS Code APIs
- Integration tests use VS Code's test framework
- Debug functionality tests use real debug sessions with test files in `/testdata`
- Each package has its own test configuration



REMEMBER HOW YOU SHOULD DO:
-Always think about best coding practice, follow the DRY, KISS and other best practices that big tech company follow
-Keep files small, less than 500 lines. 
- Always reflect if your solution is the most optimal in both of time and memory complexity. Think like when you solve leetcode problems.

