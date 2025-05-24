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

**📋 Step-by-step setup:**
1. Find your Heptabase backup directory (usually `Documents/Heptabase-auto-backup`)
2. Copy the configuration above to your Claude Desktop config file
3. Replace `/path/to/your/heptabase/backups` with your actual backup path
4. Restart Claude Desktop

See [QUICK_START.md](./QUICK_START.md) for detailed setup instructions.

### Local Development

1. Clone and install:
   ```bash
   git clone <repository-url>
   cd heptabase-mcp
   npm install
   ```

2. Configure using environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your actual paths
   ```

3. Build and start:
   ```bash
   npm run build
   npm start
   ```

### Configuration

This project uses a privacy-safe configuration system:

- **Example files** (safe for git): `claude-config-example.json`, `.env.example`
- **Personal files** (gitignored): `claude-config-*personal*.json`, `.env`

See [CONFIG.md](./CONFIG.md) for detailed configuration instructions.

### Basic Usage

```typescript
// Configure backup path
await mcpClient.callTool({
  name: "configureBackupPath",
  parameters: {
    path: "/path/to/your/heptabase/backups"
  }
});

// List available backups
const backups = await mcpClient.callTool({
  name: "listBackups"
});

// Search for whiteboards
const whiteboards = await mcpClient.callTool({
  name: "searchWhiteboards",
  parameters: {
    query: "Project Planning"
  }
});

// Get full whiteboard content
const whiteboard = await mcpClient.callTool({
  name: "getWhiteboard",
  parameters: {
    whiteboardId: "your-whiteboard-id",
    includeCards: true,
    includeConnections: true
  }
});

// Export to markdown
const markdown = await mcpClient.callTool({
  name: "exportWhiteboard",
  parameters: {
    whiteboardId: "your-whiteboard-id",
    format: "markdown"
  }
});
```

## Available Tools

### Backup Management
- `configureBackupPath` - Set backup directory
- `listBackups` - List available backups
- `loadBackup` - Load a specific backup

### Search Operations
- `searchWhiteboards` - Search whiteboards by name or content
- `searchCards` - Search cards across all whiteboards

### Data Retrieval
- `getWhiteboard` - Get complete whiteboard data
- `getCard` - Get card content in multiple formats
- `getCardContent` - Get card content as resource (bypasses size limits)
- `getCardsByArea` - Find cards by position on whiteboard

### Export Functions
- `exportWhiteboard` - Export to Markdown, JSON, HTML formats
- `summarizeWhiteboard` - Generate AI-powered summaries

### Analysis Tools
- `analyzeGraph` - Analyze card relationships and connections
- `compareBackups` - Compare different backup versions

### Debug Tools
- `debugInfo` - Get system status and diagnostics

## Development

### Project Structure

```
heptabase-mcp/
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # MCP server implementation
│   ├── services/             # Core business logic
│   │   ├── BackupManager.ts  # Backup file management
│   │   └── HeptabaseDataService.ts # Data querying
│   ├── tools/                # MCP tool implementations
│   ├── types/                # TypeScript definitions
│   └── utils/                # Helper functions
├── tests/                    # Test suites
├── docs/                     # Documentation
└── config files              # Configuration templates
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Building

```bash
# Build for production
npm run build

# Development mode with auto-reload
npm run dev

# Type checking only
npm run type-check
```

## Documentation

- [📚 Complete Specification](./SPECIFICATION.md) - Detailed API and architecture
- [🚀 Quick Start Guide](./QUICK_START.md) - Get up and running fast
- [⚙️ Configuration Guide](./CONFIG.md) - Safe configuration practices
- [📖 Claude Desktop Setup](./CLAUDE_DESKTOP_NPX.md) - NPX integration guide

## Privacy & Security

This project follows privacy-by-design principles:

- ✅ Personal paths are never committed to git
- ✅ Backup data stays local on your machine
- ✅ Configuration templates use safe placeholders
- ✅ Gitignore protects sensitive files

## Requirements

- **Node.js** 18+ 
- **Heptabase** with backup exports enabled
- **Claude Desktop** (for MCP integration)

## Troubleshooting

### Common Issues

- **"No backups found"** - Check your `HEPTABASE_BACKUP_PATH` points to the correct directory
- **"Command not found: npx"** - Install Node.js from [nodejs.org](https://nodejs.org/)
- **Claude doesn't see tools** - Restart Claude Desktop completely after config changes

### Debug Mode

Use the `debugInfo` tool to check system status:
```typescript
await mcpClient.callTool({ name: "debugInfo" });
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

See [SPECIFICATION.md](./SPECIFICATION.md) for architecture details.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Support

- 🐛 **Bug reports**: [GitHub Issues](https://github.com/yourusername/heptabase-mcp/issues)
- 💬 **Questions**: [GitHub Discussions](https://github.com/yourusername/heptabase-mcp/discussions)
- 📧 **Security issues**: Please report privately

---

Made with ❤️ for the Heptabase community
