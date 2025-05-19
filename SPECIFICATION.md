# Heptabase MCP Service Specification

## Overview

The Heptabase MCP (Model Context Protocol) Service provides AI assistants with the ability to interact with Heptabase backup data. It enables searching, retrieving, analyzing, and exporting Heptabase whiteboards and cards through a standardized MCP interface.

## Core Features

### 1. Backup Management
- Automatic discovery and loading of backup files from a configured directory
- Support for both .zip and extracted JSON files
- Automatic extraction of zip backups
- File watching for new backups
- Version comparison and management

### 2. Data Retrieval
- Search whiteboards by name, content, or date
- Search cards by content, tags, or properties
- Retrieve complete whiteboard data with all cards and connections
- Find relationships between cards
- Query cards by position on whiteboards

### 3. Export Capabilities
- Export whiteboards to Markdown
- Generate visual representations (Mermaid, GraphViz)
- Create summaries of whiteboards
- Export to JSON format

### 4. Analysis Tools
- Graph analysis of card relationships
- Find connections between cards
- Generate insights from whiteboards
- Compare different backup versions

## Architecture

```
┌─────────────────────┐
│   MCP Client        │
│   (Claude, etc.)    │
└──────────┬──────────┘
           │
           │ MCP Protocol
           │
┌──────────▼──────────┐
│   MCP Server        │
│  (Heptabase MCP)    │
├─────────────────────┤
│  - Tools            │
│  - Resources        │
│  - Settings         │
└──────────┬──────────┘
           │
           │
┌──────────▼──────────┐
│  Backup Manager     │
├─────────────────────┤
│  - Unzip Handler    │
│  - File Monitor     │
│  - Version Control  │
└──────────┬──────────┘
           │
           │
┌──────────▼──────────┐
│  Heptabase Data     │
│  Service Layer      │
├─────────────────────┤
│  - Parser           │
│  - Query Engine     │
│  - Cache Manager    │
└──────────┬──────────┘
           │
           │
┌──────────▼──────────┐
│  Backup Storage     │
│  - Original (.zip)  │
│  - Extracted (JSON) │
└─────────────────────┘
```

## MCP Tools Specification

### Backup Management Tools

#### configureBackupPath
Configure the backup directory path and monitoring settings.
```typescript
tool: "configureBackupPath"
parameters: {
  path: string              // Path to backup directory
  watchForChanges?: boolean // Auto-detect new backups
  autoExtract?: boolean     // Auto-extract zip files
}
```

#### listBackups
List available backup files in the configured directory.
```typescript
tool: "listBackups"
parameters: {
  path?: string            // Override default path
  sortBy?: "date" | "size" // Sort order
  limit?: number          // Max results
}
```

#### loadBackup
Load a specific backup file into memory.
```typescript
tool: "loadBackup"
parameters: {
  backupPath?: string     // Full path to backup
  backupId?: string      // Or use backup ID
  extract?: boolean      // Extract if zipped
}
```

### Search Tools

#### searchWhiteboards
Search for whiteboards by various criteria.
```typescript
tool: "searchWhiteboards"
parameters: {
  query?: string
  dateRange?: { start: Date, end: Date }
  hasCards?: boolean
  spaceId?: string
}
```

#### searchCards
Search for cards across all whiteboards.
```typescript
tool: "searchCards"
parameters: {
  query?: string
  tags?: string[]
  whiteboardId?: string
  contentType?: "text" | "image" | "link"
  dateRange?: { start: Date, end: Date }
}
```

### Data Retrieval Tools

#### getWhiteboard
Retrieve complete whiteboard data.
```typescript
tool: "getWhiteboard"
parameters: {
  whiteboardId: string
  includeCards?: boolean
  includeConnections?: boolean
  depth?: number          // For nested cards
}
```

#### getCard
Retrieve card data in various formats.
```typescript
tool: "getCard"
parameters: {
  cardId: string
  format?: "json" | "markdown" | "html"
  includeRelated?: boolean
}
```

#### getCardsByArea
Get cards within a specific area on a whiteboard.
```typescript
tool: "getCardsByArea"
parameters: {
  whiteboardId: string
  x: number
  y: number
  radius?: number
}
```

### Export Tools

#### exportWhiteboard
Export whiteboard to various formats.
```typescript
tool: "exportWhiteboard"
parameters: {
  whiteboardId: string
  format: "markdown" | "json" | "mermaid" | "graphviz"
  includeImages?: boolean
}
```

#### summarizeWhiteboard
Generate a summary of whiteboard content.
```typescript
tool: "summarizeWhiteboard"
parameters: {
  whiteboardId: string
  maxLength?: number
  focusAreas?: string[]
}
```

### Analysis Tools

#### analyzeGraph
Analyze relationships between cards.
```typescript
tool: "analyzeGraph"
parameters: {
  startCardId: string
  maxDepth?: number
  relationshipTypes?: string[]
}
```

#### compareBackups
Compare two backup versions.
```typescript
tool: "compareBackups"
parameters: {
  backup1: string
  backup2: string
  compareType: "summary" | "detailed" | "changes"
}
```

## Data Models

### Whiteboard
```typescript
interface Whiteboard {
  id: string
  name: string
  createdBy: string
  createdTime: string
  lastEditedTime: string
  spaceId: string
  isTrashed: boolean
}
```

### Card
```typescript
interface Card {
  id: string
  title?: string
  content: string          // JSON string with rich text
  createdBy: string
  createdTime: string
  lastEditedTime: string
  spaceId: string
  isTrashed: boolean
  insights?: any[]
  propertiesConfig?: any
}
```

### Card Instance
```typescript
interface CardInstance {
  id: string
  cardId: string
  whiteboardId: string
  x: number
  y: number
  width: number
  height: number
  color: string
  createdBy: string
  createdTime: string
  lastEditedTime: string
  spaceId: string
}
```

### Connection
```typescript
interface Connection {
  id: string
  whiteboardId: string
  beginId: string
  beginObjectType: string
  endId: string
  endObjectType: string
  color: string
  lineStyle: string
  type: string
  createdBy: string
  createdTime: string
}
```

## Settings Configuration

The service uses a `.mcp-settings.json` file for configuration:

```json
{
  "backupPath": "/Users/stanley/Documents/Heptabase-auto-backup",
  "autoExtract": true,
  "watchDirectory": true,
  "extractionPath": "./data/extracted",
  "keepExtracted": true,
  "maxBackups": 10,
  "cacheEnabled": true,
  "cacheTTL": 3600,
  "autoSelectLatest": true,
  "dateFormat": "YYYY-MM-DD",
  "timezone": "Asia/Taipei"
}
```

## Implementation Requirements

### Technical Stack
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **MCP SDK**: @anthropic/mcp
- **File Handling**: unzipper, fs-extra
- **JSON Processing**: Native JSON, lodash
- **Caching**: In-memory with optional Redis

### Performance Considerations
1. Lazy loading of backup files
2. Incremental JSON parsing for large files
3. Smart caching of frequently accessed data
4. Background extraction of zip files
5. Memory usage monitoring and limits

### Security Considerations
1. Input validation for all tool parameters
2. Path traversal prevention
3. Rate limiting for expensive operations
4. Secure handling of file paths
5. No execution of arbitrary code

### Error Handling
1. Graceful handling of missing files
2. Clear error messages for invalid operations
3. Fallback for corrupted backup files
4. Timeout handling for long operations
5. Memory overflow prevention

## Development Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Basic MCP server setup
- [ ] Settings management
- [ ] Backup file discovery
- [ ] Zip extraction functionality

### Phase 2: Data Service Layer (Week 3-4)
- [ ] JSON parsing and data models
- [ ] Basic search functionality
- [ ] Caching implementation
- [ ] Error handling

### Phase 3: MCP Tools Implementation (Week 5-6)
- [ ] Search tools
- [ ] Data retrieval tools
- [ ] Export tools
- [ ] Analysis tools

### Phase 4: Advanced Features (Week 7-8)
- [ ] File watching
- [ ] Version comparison
- [ ] Graph analysis
- [ ] Performance optimization

### Phase 5: Testing & Documentation (Week 9-10)
- [ ] Unit tests
- [ ] Integration tests
- [ ] API documentation
- [ ] User guide

## Usage Examples

### Initial Setup
```typescript
// Configure backup location
await mcpClient.callTool({
  name: "configureBackupPath",
  parameters: {
    path: "/Users/stanley/Documents/Heptabase-auto-backup",
    watchForChanges: true,
    autoExtract: true
  }
});
```

### Search Operations
```typescript
// Search for whiteboards
const { whiteboards } = await mcpClient.callTool({
  name: "searchWhiteboards",
  parameters: {
    query: "Button Refactor"
  }
});

// Search for cards
const { cards } = await mcpClient.callTool({
  name: "searchCards",
  parameters: {
    tags: ["important", "todo"],
    dateRange: {
      start: "2024-01-01",
      end: "2024-12-31"
    }
  }
});
```

### Data Retrieval
```typescript
// Get whiteboard with all content
const whiteboard = await mcpClient.callTool({
  name: "getWhiteboard",
  parameters: {
    whiteboardId: "553bb6e7-4bda-48bf-8f1c-d18891364077",
    includeCards: true,
    includeConnections: true
  }
});
```

### Export Operations
```typescript
// Export to Markdown
const { markdown } = await mcpClient.callTool({
  name: "exportWhiteboard",
  parameters: {
    whiteboardId: "553bb6e7-4bda-48bf-8f1c-d18891364077",
    format: "markdown",
    includeImages: true
  }
});
```

## Success Criteria

1. Successfully load and parse Heptabase backup files
2. Provide fast search across thousands of cards
3. Export whiteboards maintaining structure and formatting
4. Handle large backup files without memory issues
5. Provide clear error messages for all failure cases

## Future Enhancements

1. Support for real-time Heptabase API integration
2. Collaborative features for multi-user access
3. AI-powered content suggestions
4. Advanced visualization options
5. Integration with other note-taking tools