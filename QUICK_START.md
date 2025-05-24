# Quick Start Guide

## 1. Find your Heptabase backup directory

First, locate where Heptabase stores its backups:
- Usually in `Documents/Heptabase-auto-backup` or similar
- Contains `.zip` files with dates like `heptabase-backup-2024-01-01.zip`

## 2. Configure Claude Desktop

Open Claude Desktop's configuration file:

- **macOS**: `open ~/Library/Application\ Support/Claude/claude_desktop_config.json`
- **Windows**: `notepad %APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `nano ~/.config/Claude/claude_desktop_config.json`

## 3. Add the MCP server

Copy and paste this configuration, updating the backup path:

```json
{
  "mcpServers": {
    "heptabase": {
      "command": "npx",
      "args": ["@heptabase/mcp"],
      "env": {
        "HEPTABASE_BACKUP_PATH": "/path/to/your/heptabase/backups"
      }
    }
  }
}
```

## 4. Restart Claude Desktop

Quit and restart Claude Desktop completely.

## 5. Test it!

Ask Claude:
- "List my Heptabase backups"
- "Search for whiteboards about projects"
- "Show me cards in my Ideas whiteboard"

## Common Issues

### "Command not found: npx"
Install Node.js from https://nodejs.org/

### "No backups found"
Check that your `HEPTABASE_BACKUP_PATH` is correct and contains `.zip` files

### Claude doesn't recognize the commands
1. Make sure you restarted Claude Desktop
2. Check logs at `~/Library/Logs/Claude/mcp.log` (macOS)

## Example Configuration

**For NPX usage (recommended):**
```json
{
  "mcpServers": {
    "heptabase": {
      "command": "npx",
      "args": ["@heptabase/mcp"],
      "env": {
        "HEPTABASE_BACKUP_PATH": "/Users/yourusername/Documents/Heptabase-auto-backup"
      }
    }
  }
}
```

**For Local Development:**
See `claude-config-example.json` for a complete configuration template.

## Personal Configuration

For your personal setup, copy one of the example config files and modify the paths:
- `claude-config-npx.json` → Your personal NPX config
- `claude-config-example.json` → Your personal local development config

These personal config files are gitignored and won't be committed to the repository.

That's it! No installation needed - `npx` handles everything automatically.
