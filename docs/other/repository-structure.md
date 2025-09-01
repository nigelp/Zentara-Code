# Zentara Code Repository Structure

## Overview

Zentara Code is a sophisticated VS Code extension that serves as an AI-powered coding assistant with integrated runtime debugging capabilities. It's built as a monorepo using pnpm workspaces with Turbo for build orchestration.

## Project Type & Architecture
- **Type**: TypeScript-based VS Code Extension with React WebView UI
- **Architecture**: Monorepo using pnpm workspaces with Turbo for build orchestration
- **Package Manager**: pnpm (version 10.8.1)
- **Build System**: Turbo + esbuild for bundling
- **Testing**: Vitest framework
- **Development**: Hot-reload development with watch modes

## Top-Level Directory Structure

```
/
├── apps/                    # Applications in the monorepo
├── packages/                # Shared packages
├── src/                     # Main VS Code extension source
├── webview-ui/             # React-based sidebar UI
├── docs/                   # Documentation
├── locales/               # Internationalization files
├── scripts/               # Build and utility scripts
├── .vscode/               # VS Code workspace configuration
├── .github/               # GitHub Actions CI/CD workflows
├── .roo/                  # Project-specific rules and configurations
└── [config files]         # Various configuration files
```

## Core Extension Code (`/src`)

The main VS Code extension codebase organized by functionality:

### API Layer (`/src/api`)
**Purpose**: AI provider integrations and API abstraction
- **`/providers`** - Extensive provider ecosystem supporting 30+ AI services:
  - Major providers: Anthropic, OpenAI, Google (Gemini, Vertex)
  - Cloud providers: AWS Bedrock, Azure OpenAI
  - Specialized: Ollama, LM Studio, Groq, Cerebras, DeepSeek
  - Enterprise: Fireworks, Together AI, Moonshot, SambaNova
- **`/transform`** - Request/response transformation and caching
  - Format normalization across different AI APIs
  - Response caching and optimization

### Core Foundation (`/src/core`)
**Purpose**: Fundamental infrastructure and business logic
- **`assistant-message/`** - Message handling and formatting for AI conversations
- **`checkpoints/`** - State management and conversation checkpointing
- **`condense/`** - Context window management and conversation condensation
- **`config/`** - Configuration management and settings
- **`context-tracking/`** - Context awareness and tracking across conversations
- **`diff/`** - Code difference analysis and application
- **`environment/`** - Environment detection and workspace analysis
- **`ignore/`** - File and directory exclusion patterns
- **`mentions/`** - Symbol and reference handling
- **`prompts/`** - AI prompt generation and management (80+ tools)
- **`protect/`** - Safety mechanisms for code modifications
- **`sliding-window/`** - Context window optimization
- **`task/`** - Task execution and management (2,586 lines)
- **`task-persistence/`** - Task state persistence
- **`tools/`** - Core tool implementations (80+ tools)
- **`webview/`** - Communication with the React UI (2,864 lines)

### Debug Architecture (`/src/roo_debug`)
**Purpose**: Advanced debugging capabilities built on Debug Adapter Protocol
- **`IDebugController.ts`** - Interface defining all debug operations
- **`VsCodeDebugController.ts`** - VS Code DAP implementation
- **`controller/`** - Debug session management controllers
- **`debug/`** - Core debug functionality (31 specialized debug tools)
- **`debug_helper/`** - Debug utilities and helpers
- **`terminal/`** - Terminal integration for debug output

### VS Code Integration (`/src/integrations`)
**Purpose**: Deep VS Code API integration
- **`claude-code/`** - Core Claude Code integration
- **`diagnostics/`** - Error and warning handling
- **`editor/`** - Text editor operations
- **`terminal/`** - Terminal management
- **`workspace/`** - Workspace and file management
- **`theme/`** - UI theming support
- **`misc/`** - Miscellaneous VS Code integrations

### Service Layer (`/src/services`)
**Purpose**: Specialized services for core functionality
- **`browser/`** - Web browser automation (Puppeteer)
- **`mcp/`** - Model Context Protocol integration
- **`search/`** - Code search and indexing
- **`ripgrep/`** - Fast text search integration
- **`tree-sitter/`** - Syntax tree parsing
- **`code-index/`** - Code indexing and analysis
- **`glob/`** - File pattern matching
- **`command/`** - Command execution
- **`roo-config/`** - Configuration management
- **`checkpoints/`** - State checkpoint management
- **`marketplace/`** - Extension marketplace integration
- **`mdm/`** - Mode and task management

### Specialized Components
- **`/zentara_lsp`** - Language Server Protocol integration for semantic code understanding
- **`/roo_subagent`** - Parallel task execution system for handling complex workflows
- **`/roo_tool_prompt_management`** - Dynamic tool loading and prompt management

### Supporting Infrastructure
- **`/activate`** - Extension activation and command registration
- **`/assets`** - Icons, images, and static resources
- **`/i18n`** - Internationalization support (14 languages)
- **`/exports`** - Public API exports

## User Interface (`/webview-ui`)

**Purpose**: React-based sidebar UI for the extension
- Built with Vite
- TypeScript + React
- Communicates with extension via IPC
- Modern UI components with Tailwind CSS

## Shared Packages (`/packages`)

### Core Architecture Packages
1. **`@roo-code/types`** - Central TypeScript definitions using Zod validation
2. **`@roo-code/cloud`** - Cloud service integration layer
3. **`@roo-code/ipc`** - Inter-Process Communication for remote access
4. **`@roo-code/telemetry`** - Analytics and monitoring infrastructure

### Development & Testing
5. **`@roo-code/evals`** - Comprehensive evaluation framework with database backend

### Configuration
6. **`@roo-code/config-eslint`** - Shared ESLint configurations
7. **`@roo-code/config-typescript`** - Shared TypeScript configurations

### Publishing
8. **`@roo-code/types/npm`** - NPM publishing setup for types package

## Applications (`/apps`)

1. **`vscode-e2e`** - End-to-End testing framework
   - Comprehensive test suite for VS Code extension
   - Tool integration tests, mode switching tests

2. **`vscode-nightly`** - Nightly build system
   - Automated nightly build generation
   - Custom esbuild configuration

3. **`web-evals`** - Evaluation and testing web application
   - Next.js web app for running AI model evaluations
   - Real-time streaming results with SSE

4. **`web-roo-code`** - Marketing and documentation website
   - Public-facing website with animations
   - Enterprise pages and business features

5. **`web-docs`** - Documentation site (placeholder)

## Configuration Directories

### **`.vscode/` - VS Code Workspace Configuration**
- `extensions.json`, `launch.json`, `settings.json`, `tasks.json`
- Ensures consistent development environment

### **`.github/` - GitHub Repository Automation**
- Extensive CI/CD pipeline with 10 workflow files
- Code quality checks, automated releases, marketplace publishing
- Issue templates and CODEOWNERS

### **`.roo/` - Zentara Project-Specific Configuration**
- AI assistant mode definitions with specialized rule sets
- Mode-specific configurations for different workflows
- MCP (Model Context Protocol) configuration

### **`scripts/` - Development Automation**
- Build and utility scripts
- Internationalization management
- Monorepo package linking automation

### **`locales/` - Internationalization Support**
- Support for 15 languages
- Localized README, contributing guidelines, and code of conduct

## Documentation (`/docs`)

- Project documentation and architectural guides
- API documentation
- Tool call flow documentation
- Subagent system documentation

## Key Architectural Patterns

1. **Monorepo Structure**: Efficiently manages multiple related packages and applications
2. **Event-Driven**: Uses EventEmitter patterns for debug events, file changes, and UI updates
3. **Modular Design**: Clear separation between extension logic, UI, and shared utilities
4. **Interface-Driven**: Clean contracts between layers (e.g., `IDebugController`)
5. **Factory Pattern**: Provider factory for AI service creation
6. **Type Safety**: Comprehensive TypeScript coverage with shared type definitions

## Development Workflow

- **Build**: `pnpm build` (builds all packages)
- **Development**: `pnpm watch` (hot-reload)
- **Testing**: `pnpm test` (runs tests across monorepo)
- **Package**: `pnpm vsix` (creates .vsix extension file)

## Key Features

### AI Integration
- Multiple AI provider support (30+ providers)
- Streaming responses with unified interface
- Context management across conversations

### Advanced Debugging System
- 31 specialized debug tools for runtime analysis
- Debug Adapter Protocol (DAP) integration
- Language-agnostic debugging support
- Real-time variable inspection and breakpoint management

### Extensibility
- MCP (Model Context Protocol) integration for dynamic tool loading
- Subagent system for parallel task execution
- LSP integration for code intelligence

This architecture demonstrates a mature, enterprise-grade VS Code extension with sophisticated AI integration, comprehensive debugging capabilities, and extensive provider ecosystem support.