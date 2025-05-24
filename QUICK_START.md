# Quick Start Guide

## 1. Clone and Setup the Project

First, clone the repository and install dependencies:

```bash
git clone <repository-url>
cd heptabase-mcp
npm install
```

## 2. Find your Heptabase backup directory

Locate where Heptabase stores its backups:
- Usually in `Documents/Heptabase-auto-backup` or similar
- Contains `.zip` files with dates like `Heptabase-Data-Backup-2024-01-01T12-00-00-000Z.zip`

## 3. Configure Environment Variables

Create your personal configuration:

```bash
cp .env.example .env
```

Edit `.env` with your actual paths:
```env
HEPTABASE_BACKUP_PATH=/path/to/your/heptabase/backups
HEPTABASE_AUTO_EXTRACT=true
HEPTABASE_WATCH_DIRECTORY=true
```

## 4. Build the Project

```bash
npm run build
```

## 5. Configure Claude Desktop

Open Claude Desktop's configuration file:

- **macOS**: `open ~/Library/Application\ Support/Claude/claude_desktop_config.json`
- **Windows**: `notepad %APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `nano ~/.config/Claude/claude_desktop_config.json`

## 6. Add the MCP server

Copy and paste this configuration, updating the paths:

```json
{
  "mcpServers": {
    "heptabase": {
      "command": "/path/to/node",
      "args": ["/path/to/your/heptabase-mcp/dist/index.js"],
      "env": {
        "HEPTABASE_BACKUP_PATH": "/path/to/your/heptabase/backups",
        "HEPTABASE_AUTO_EXTRACT": "true",
        "HEPTABASE_WATCH_DIRECTORY": "true"
      }
    }
  }
}
```

**Important:** 
- Find your Node.js path with: `which node`
- Use your actual project directory path
- Set your actual Heptabase backup directory path

## 7. Restart Claude Desktop

Quit and restart Claude Desktop completely.

## 8. Test it!

Ask Claude:
- "List my Heptabase backups"
- "Search for whiteboards about projects"
- "Show me cards in my Ideas whiteboard"

## Common Issues

### "Command not found" or "No such file"
- Check that Node.js is installed: `node --version`
- Verify the paths in your Claude Desktop config are correct
- Make sure you built the project: `npm run build`

### "No backups found"
- Check that your `HEPTABASE_BACKUP_PATH` is correct and contains `.zip` files
- Ensure the backup directory exists and is accessible

### Claude doesn't recognize the commands
1. Make sure you restarted Claude Desktop completely
2. Check Claude Desktop logs at:
   - **macOS**: `~/Library/Logs/Claude/mcp.log`
   - **Windows**: `%LOCALAPPDATA%\Claude\logs\mcp.log`

## Example Configuration

**For macOS with nvm:**
```json
{
  "mcpServers": {
    "heptabase": {
      "command": "/Users/yourusername/.nvm/versions/node/v20.18.0/bin/node",
      "args": ["/Users/yourusername/Code/heptabase-mcp/dist/index.js"],
      "env": {
        "HEPTABASE_BACKUP_PATH": "/Users/yourusername/Documents/Heptabase-auto-backup",
        "HEPTABASE_AUTO_EXTRACT": "true",
        "HEPTABASE_WATCH_DIRECTORY": "true"
      }
    }
  }
}
```

**For Windows:**
```json
{
  "mcpServers": {
    "heptabase": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["C:\\Users\\yourusername\\Code\\heptabase-mcp\\dist\\index.js"],
      "env": {
        "HEPTABASE_BACKUP_PATH": "C:\\Users\\yourusername\\Documents\\Heptabase-auto-backup",
        "HEPTABASE_AUTO_EXTRACT": "true",
        "HEPTABASE_WATCH_DIRECTORY": "true"
      }
    }
  }
}
```

## Personal Configuration Files

For convenience, you can use the provided personal config templates:

1. Copy a template:
   ```bash
   cp claude-config-example.json claude-config-my-setup.json
   ```

2. Edit with your actual paths
3. Copy the contents to your Claude Desktop config

The personal config files (`*personal*.json`, `*my-setup*.json`) are gitignored and won't be committed.

## Next Steps

Once everything is working:
- Explore the available tools with `debugInfo`
- Try searching your whiteboards and cards
- Export content to different formats
- Set up file watching for automatic backup detection

For more advanced configuration options, see [CONFIG.md](./CONFIG.md) and [ENV_SETUP.md](./ENV_SETUP.md).
