# @heptabase/mcp

A Model Context Protocol (MCP) service for interacting with Heptabase backup data. This service allows AI assistants like Claude to search, retrieve, analyze, and export Heptabase whiteboards and cards.

## Features

- 🔍 Search whiteboards and cards
- 📁 Automatic backup file management
- 📄 Export to multiple formats (Markdown, JSON, Mermaid)
- 🔗 Analyze card relationships
- 📊 Generate whiteboard summaries
- ⚡ Smart caching for performance

## Quick Start

### Using with Claude Desktop (Recommended)

The easiest way to use this MCP service is with Claude Desktop via `npx`:

```json
{
  "mcpServers": {
    "heptabase": {
      "command": "npx",
      "args": ["@heptabase/mcp"],
      "env": {
        "HEPTABASE_BACKUP_PATH": "/path/to/your/heptabase/backups",
        "HEPTABASE_AUTO_EXTRACT": "true",
        "HEPTABASE_WATCH_DIRECTORY": "true"
      }
    }
  }
}
```

See `CLAUDE_DESKTOP_NPX.md` for detailed setup instructions.

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure using environment variables. Create a `.env` file:
   ```env
   HEPTABASE_BACKUP_PATH=/path/to/your/heptabase/backups
   HEPTABASE_AUTO_EXTRACT=true
   HEPTABASE_WATCH_DIRECTORY=true
   ```

3. Start the MCP server:
   ```bash
   npm start
   ```

### Basic Usage

```typescript
// Configure backup path
await mcpClient.callTool({
  name: "configureBackupPath",
  parameters: {
    path: "/Users/stanley/Documents/Heptabase-auto-backup"
  }
});

// List available backups
const { backups } = await mcpClient.callTool({
  name: "listBackups"
});

// Search for whiteboards
const { whiteboards } = await mcpClient.callTool({
  name: "searchWhiteboards",
  parameters: {
    query: "Project Planning"
  }
});
```

## Available Tools

### Backup Management
- `configureBackupPath` - Set backup directory
- `listBackups` - List available backups
- `loadBackup` - Load a specific backup

### Search Operations
- `searchWhiteboards` - Search whiteboards
- `searchCards` - Search cards

### Data Retrieval
- `getWhiteboard` - Get whiteboard data
- `getCard` - Get card data
- `getCardsByArea` - Get cards by position

### Export Functions
- `exportWhiteboard` - Export to various formats
- `summarizeWhiteboard` - Generate summaries

### Analysis Tools
- `analyzeGraph` - Analyze relationships
- `compareBackups` - Compare versions

## Development

### Project Structure

```
heptabase-mcp/
├── src/
│   ├── index.ts              # MCP server
│   ├── config/               # Configuration
│   ├── services/             # Core services
│   ├── tools/                # MCP tools
│   └── types/                # TypeScript types
├── tests/                    # Test files
├── package.json
└── tsconfig.json
```

### Testing

```bash
npm test
```

### Building

```bash
npm run build
```

## Documentation

For detailed documentation, see [SPECIFICATION.md](./SPECIFICATION.md).

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

For issues and feature requests, please use the GitHub issue tracker.