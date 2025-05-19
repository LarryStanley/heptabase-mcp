# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) service for interacting with Heptabase backup data. The service enables AI assistants like Claude to search, retrieve, analyze, and export Heptabase whiteboards and cards through a standardized MCP interface.

## Commands

```bash
# Install dependencies
npm install

# Development
npm run dev         # Run with ts-node for development
npm start          # Run compiled JavaScript

# Testing
npm test           # Run all tests
npm test:watch     # Run tests in watch mode
npm test:coverage  # Run tests with coverage
npm test:integration # Run integration tests

# Building and Linting
npm run build      # Compile TypeScript to JavaScript
npm run type-check # Type check without emitting
npm run lint       # Type check with tsc --noEmit

# Publishing
npm run prepublishOnly # Build and test before publish
```

## Architecture

The project follows a layered architecture:

1. **Entry Point** (`src/index.ts`)
   - Sets up environment variables
   - Initializes and starts the MCP server
   - Handles process signals

2. **MCP Server** (`src/server.ts`)
   - Core MCP server implementation
   - Registers tools with the MCP protocol
   - Manages tool execution and error handling

3. **Service Layer** (`src/services/`)
   - `BackupManager`: Manages backup files, ZIP extraction, file watching
   - `HeptabaseDataService`: Handles JSON parsing, data queries, caching

4. **Tools** (`src/tools/`)
   - MCP tool implementations organized by function:
     - Backup management
     - Search operations
     - Data retrieval
     - Export functionality
     - Analysis tools

5. **Types** (`src/types/`)
   - TypeScript interfaces for Heptabase data models
   - MCP protocol type definitions

## Testing

The project uses Jest for testing:

- **Unit tests**: Located in `tests/unit/`
- **Integration tests**: Located in `tests/integration/`
- **Test fixtures**: Located in `tests/fixtures/`

Test configurations:
- `jest.config.js`: Main test configuration
- `jest.integration.config.js`: Integration test configuration
- `jest.setup.ts`: Test setup and mocks

## Environment Configuration

The service uses environment variables for configuration:

```env
HEPTABASE_BACKUP_PATH=/path/to/heptabase/backups
HEPTABASE_AUTO_EXTRACT=true
HEPTABASE_WATCH_DIRECTORY=true
HEPTABASE_EXTRACTION_PATH=./data/extracted
HEPTABASE_KEEP_EXTRACTED=true
HEPTABASE_MAX_BACKUPS=10
HEPTABASE_CACHE_ENABLED=true
```

## Development Workflow

1. **Adding new tools**:
   - Define the tool interface in the appropriate category under `src/tools/`
   - Register the tool in `src/server.ts`
   - Add tests in `tests/unit/tools/`

2. **Updating data models**:
   - Modify interfaces in `src/types/heptabase.ts`
   - Update corresponding services and tools
   - Add or update tests

3. **Running tests**:
   - Run `npm test` before committing
   - Use `npm test:watch` during development
   - Check coverage with `npm test:coverage`

4. **Type checking**:
   - Run `npm run type-check` to check types without building
   - Run `npm run build` to compile and check for errors

## Key Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `unzipper`: ZIP file extraction
- `fs-extra`: Enhanced file system operations
- `chokidar`: File watching
- `lodash`: Utility functions
- `zod`: Schema validation
- `dotenv`: Environment variable loading

## Error Handling

The project uses standardized error handling:
- All errors are caught and properly formatted for MCP protocol
- Tool errors include descriptive messages for debugging
- File operations use fs-extra for better error messages
- Validation uses Zod for parameter checking

## Performance Considerations

1. **Lazy loading**: Backup files are loaded on demand
2. **Caching**: Frequently accessed data is cached in memory
3. **Streaming**: Large files are processed using streams
4. **Background extraction**: ZIP files are extracted asynchronously
5. **File watching**: Only watches when configured to reduce overhead