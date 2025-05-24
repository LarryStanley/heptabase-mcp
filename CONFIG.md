# Configuration Files

This directory contains several configuration file types:

## Public (Safe for Git)
- `claude-config-example.json` - Template for local development setup
- `.env.example` - Environment variables template
- `.mcp-settings.example.json` - Template for MCP settings

## Private (Gitignored)
- `claude-config-*personal*.json` - Your actual config files with real paths
- `.env` - Your environment variables
- `.mcp-settings.json` - Your actual MCP settings

## Usage

1. Copy the example files to create your personal versions:
   ```bash
   cp claude-config-example.json claude-config-personal.json
   cp .env.example .env
   ```

2. Edit the personal files with your actual paths:
   ```json
   {
     "command": "/path/to/your/node",
     "args": ["/path/to/your/heptabase-mcp/dist/index.js"],
     "env": {
       "HEPTABASE_BACKUP_PATH": "/Users/yourusername/Documents/Heptabase-auto-backup"
     }
   }
   ```

3. Use the personal configuration in your Claude Desktop setup.

## Environment Variables

The recommended approach is to use `.env` files for configuration:

```env
HEPTABASE_BACKUP_PATH=/path/to/your/heptabase/backups
HEPTABASE_AUTO_EXTRACT=true
HEPTABASE_WATCH_DIRECTORY=true
```

## Claude Desktop Setup

For Claude Desktop, you'll need to specify the full paths to Node.js and your built project:

```json
{
  "mcpServers": {
    "heptabase": {
      "command": "/path/to/node",
      "args": ["/path/to/your/heptabase-mcp/dist/index.js"],
      "env": {
        "HEPTABASE_BACKUP_PATH": "/path/to/your/heptabase/backups"
      }
    }
  }
}
```

## Privacy Protection

The personal files are automatically ignored by git to protect your privacy:
- `*personal*.json` files
- `.env` files  
- `.mcp-settings.json`

This ensures your actual paths and sensitive information never get committed to version control.
