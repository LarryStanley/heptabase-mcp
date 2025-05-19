# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) service for interacting with Heptabase backup data. The service enables AI assistants to search, retrieve, analyze, and export Heptabase whiteboards and cards.

## Development Commands

Since this project is not yet implemented, these commands are planned based on the specification:

```bash
# Install dependencies
npm install

# Development
npm run dev         # Run in development mode with hot reload
npm start          # Run the MCP server

# Testing
npm test           # Run all tests
npm test:watch     # Run tests in watch mode

# Building
npm run build      # Build TypeScript to JavaScript
npm run type-check # Check TypeScript types

# Linting
npm run lint       # Run ESLint
npm run lint:fix   # Fix auto-fixable lint issues
```

## Architecture

The project follows a layered architecture:

1. **MCP Server Layer** (`src/index.ts`)
   - Implements MCP protocol
   - Handles tool registration and execution
   - Manages resources and settings

2. **Service Layer** (`src/services/`)
   - `BackupManager`: Handles backup file operations, zip extraction, file watching
   - `HeptabaseDataService`: Parses JSON data, provides query interface, manages cache
   - Core business logic for working with Heptabase data

3. **Tools Layer** (`src/tools/`)
   - Individual MCP tool implementations
   - Categories: backup management, search, data retrieval, export, analysis

4. **Type Definitions** (`src/types/`)
   - TypeScript interfaces for Heptabase data structures
   - MCP protocol types

## Key Implementation Notes

### Backup File Handling
- Support both .zip archives and extracted JSON files
- Automatic extraction of zip files when configured
- File watching capability for auto-loading new backups
- Implement in `src/services/BackupManager.ts`

### Data Models
- `Whiteboard`: Contains metadata and structure
- `Card`: Core content unit with rich text
- `CardInstance`: Position and appearance on whiteboards
- `Connection`: Relationships between cards
- Define in `src/types/heptabase.ts`

### Performance Considerations
- Implement lazy loading for large backup files
- Use incremental JSON parsing for memory efficiency
- Add caching layer in `HeptabaseDataService`
- Background processing for zip extraction

### MCP Tools Implementation
Tools should be organized by category:
- `src/tools/backup/`: configureBackupPath, listBackups, loadBackup
- `src/tools/search/`: searchWhiteboards, searchCards
- `src/tools/retrieval/`: getWhiteboard, getCard, getCardsByArea
- `src/tools/export/`: exportWhiteboard, summarizeWhiteboard
- `src/tools/analysis/`: analyzeGraph, compareBackups

### Settings Management
- Use `.mcp-settings.json` for configuration
- Default settings should be defined in `src/config/defaults.ts`
- Support environment variable overrides

## Dependencies

Key dependencies to include in `package.json`:
- `@anthropic/mcp`: MCP protocol implementation
- `unzipper`: For extracting backup archives
- `fs-extra`: Enhanced file system operations
- `chokidar`: File watching capabilities
- `lodash`: Utility functions
- TypeScript and development tools

## Testing Strategy

1. Unit tests for data parsing and transformations
2. Integration tests for MCP tools
3. Mock Heptabase backup data for testing
4. Test file watching and extraction features

## Configuration File

Create `.mcp-settings.json` in the project root:
```json
{
  "backupPath": "/path/to/heptabase/backups",
  "autoExtract": true,
  "watchDirectory": true,
  "extractionPath": "./data/extracted",
  "keepExtracted": true,
  "cacheEnabled": true
}
```