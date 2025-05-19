# Setting up Heptabase MCP with Claude Desktop using NPX

The simplest way to use Heptabase MCP with Claude Desktop is through `npx`, which doesn't require any installation.

## 1. Configure Claude Desktop

Edit your Claude Desktop configuration file:

**On macOS:**
```bash
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**On Windows:**
```
notepad %APPDATA%\Claude\claude_desktop_config.json
```

**On Linux:**
```bash
nano ~/.config/Claude/claude_desktop_config.json
```

## 2. Add the MCP server configuration

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "heptabase": {
      "command": "npx",
      "args": ["@heptabase/mcp"],
      "env": {
        "HEPTABASE_BACKUP_PATH": "/path/to/your/heptabase/backups",
        "HEPTABASE_AUTO_EXTRACT": "true",
        "HEPTABASE_WATCH_DIRECTORY": "true",
        "HEPTABASE_EXTRACTION_PATH": "/tmp/heptabase-extracted"
      }
    }
  }
}
```

**Important:** Replace `/path/to/your/heptabase/backups` with your actual Heptabase backup directory path.

## 3. Configuration Options

All configuration is done through environment variables in the Claude Desktop config:

| Variable | Description | Default |
|----------|-------------|---------|
| `HEPTABASE_BACKUP_PATH` | Path to Heptabase backups (required) | - |
| `HEPTABASE_AUTO_EXTRACT` | Auto-extract zip files | `true` |
| `HEPTABASE_WATCH_DIRECTORY` | Watch for new backups | `false` |
| `HEPTABASE_EXTRACTION_PATH` | Where to extract zips | OS temp dir |
| `HEPTABASE_CACHE_ENABLED` | Enable caching | `true` |
| `HEPTABASE_CACHE_TTL` | Cache TTL in seconds | `3600` |

## 4. Restart Claude Desktop

Quit and restart Claude Desktop for the changes to take effect.

## 5. Test the Connection

In Claude Desktop, try these commands:

```
Can you list my Heptabase backups?
```

```
Search for whiteboards about "project planning"
```

```
Show me cards in my "Ideas" whiteboard
```

## Example Configurations

### macOS Example
```json
{
  "mcpServers": {
    "heptabase": {
      "command": "npx",
      "args": ["@heptabase/mcp"],
      "env": {
        "HEPTABASE_BACKUP_PATH": "/Users/stanley/Documents/Heptabase-auto-backup",
        "HEPTABASE_AUTO_EXTRACT": "true",
        "HEPTABASE_WATCH_DIRECTORY": "true"
      }
    }
  }
}
```

### Windows Example
```json
{
  "mcpServers": {
    "heptabase": {
      "command": "npx",
      "args": ["@heptabase/mcp"],
      "env": {
        "HEPTABASE_BACKUP_PATH": "C:\\Users\\stanley\\Documents\\Heptabase-auto-backup",
        "HEPTABASE_AUTO_EXTRACT": "true",
        "HEPTABASE_WATCH_DIRECTORY": "true"
      }
    }
  }
}
```

## Troubleshooting

If the MCP server doesn't connect:

1. **Check Claude Desktop logs:**
   - macOS: `~/Library/Logs/Claude/mcp.log`
   - Windows: `%LOCALAPPDATA%\Claude\logs\mcp.log`

2. **Verify npx is available:**
   ```bash
   npx --version
   ```
   
   If not, install Node.js from https://nodejs.org/

3. **Test manually:**
   ```bash
   npx @heptabase/mcp
   ```

4. **Check environment variables:**
   Ensure `HEPTABASE_BACKUP_PATH` is set correctly and the directory exists.

## Advantages of using NPX

1. **No installation required** - Claude Desktop will automatically download the latest version
2. **Always up to date** - Gets the latest version each time
3. **Simple configuration** - Just add to Claude Desktop config
4. **Cross-platform** - Works the same on all operating systems
5. **No path issues** - NPX handles finding the executable

## Alternative: Local Installation

If you prefer to install locally (for offline use or development):

```bash
npm install -g @heptabase/mcp
```

Then use this configuration:

```json
{
  "mcpServers": {
    "heptabase": {
      "command": "heptabase-mcp",
      "env": {
        "HEPTABASE_BACKUP_PATH": "/path/to/your/heptabase/backups"
      }
    }
  }
}
```