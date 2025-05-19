# Environment Variable Configuration

The Heptabase MCP service now supports configuration through environment variables, which is more secure and flexible than using a JSON config file.

## Configuration Options

All configuration options can be set via environment variables with the `HEPTABASE_` prefix:

| Environment Variable | Description | Default | Example |
|---------------------|-------------|---------|---------|
| `HEPTABASE_BACKUP_PATH` | Path to Heptabase backup directory | Required | `/Users/stanley/Documents/Heptabase-auto-backup` |
| `HEPTABASE_AUTO_EXTRACT` | Automatically extract zip files | `true` | `true` |
| `HEPTABASE_WATCH_DIRECTORY` | Watch backup directory for changes | `false` | `true` |
| `HEPTABASE_EXTRACTION_PATH` | Path to extract zip files | `./data/extracted` | `/tmp/heptabase-extracted` |
| `HEPTABASE_KEEP_EXTRACTED` | Keep extracted files after loading | `true` | `false` |
| `HEPTABASE_MAX_BACKUPS` | Maximum number of backups to keep | `10` | `20` |
| `HEPTABASE_CACHE_ENABLED` | Enable caching for performance | `true` | `true` |
| `HEPTABASE_CACHE_TTL` | Cache time-to-live in seconds | `3600` | `7200` |
| `HEPTABASE_AUTO_SELECT_LATEST` | Auto-select latest backup | `true` | `false` |
| `HEPTABASE_DATE_FORMAT` | Date format for display | `YYYY-MM-DD` | `MM/DD/YYYY` |
| `HEPTABASE_TIMEZONE` | Timezone for dates | `UTC` | `America/New_York` |

## Setup Methods

### Method 1: Using .env file (Recommended for development)

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your settings:
   ```env
   HEPTABASE_BACKUP_PATH=/Users/stanley/Documents/Heptabase-auto-backup
   HEPTABASE_AUTO_EXTRACT=true
   HEPTABASE_WATCH_DIRECTORY=true
   ```

3. The server will automatically load these variables when starting.

### Method 2: System Environment Variables

Set environment variables in your shell:

```bash
export HEPTABASE_BACKUP_PATH="/Users/stanley/Documents/Heptabase-auto-backup"
export HEPTABASE_AUTO_EXTRACT=true
export HEPTABASE_WATCH_DIRECTORY=true
```

Or add them to your shell profile (`~/.bash_profile`, `~/.zshrc`, etc.):

```bash
# Heptabase MCP Configuration
export HEPTABASE_BACKUP_PATH="/Users/stanley/Documents/Heptabase-auto-backup"
export HEPTABASE_AUTO_EXTRACT=true
export HEPTABASE_WATCH_DIRECTORY=true
```

### Method 3: Claude Desktop Configuration

When configuring Claude Desktop, you can pass environment variables in the config:

**Option A: Using npx (recommended)**
```json
{
  "mcpServers": {
    "heptabase": {
      "command": "npx",
      "args": [
        "@heptabase/mcp"
      ],
      "env": {
        "HEPTABASE_BACKUP_PATH": "/Users/stanley/Documents/Heptabase-auto-backup",
        "HEPTABASE_AUTO_EXTRACT": "true",
        "HEPTABASE_WATCH_DIRECTORY": "true",
        "HEPTABASE_EXTRACTION_PATH": "/Users/stanley/Code/side project/heptabase-mcp/data/extracted"
      }
    }
  }
}
```

**Option B: Using local development build**
```json
{
  "mcpServers": {
    "heptabase": {
      "command": "/Users/stanley/.nvm/versions/node/v20.18.0/bin/node",
      "args": [
        "/Users/stanley/Code/side project/heptabase-mcp/dist/index.js"
      ],
      "env": {
        "HEPTABASE_BACKUP_PATH": "/Users/stanley/Documents/Heptabase-auto-backup",
        "HEPTABASE_AUTO_EXTRACT": "true",
        "HEPTABASE_WATCH_DIRECTORY": "true",
        "HEPTABASE_EXTRACTION_PATH": "/Users/stanley/Code/side project/heptabase-mcp/data/extracted"
      }
    }
  }
}
```

## Configuration Precedence

The configuration follows this precedence (later overrides earlier):

1. Default values (built into the code)
2. Environment variables
3. `.env` file (if present)
4. `.mcp-settings.json` file (if present) - deprecated but still supported

## Migration from .mcp-settings.json

If you're migrating from the JSON config file:

1. Create a `.env` file with the equivalent environment variables
2. Remove or rename your `.mcp-settings.json` file
3. Restart the server

The server will still read `.mcp-settings.json` if it exists, but environment variables are now the recommended approach.

## Example .env file

```env
# Heptabase MCP Configuration
HEPTABASE_BACKUP_PATH=/Users/stanley/Documents/Heptabase-auto-backup
HEPTABASE_AUTO_EXTRACT=true
HEPTABASE_WATCH_DIRECTORY=true
HEPTABASE_EXTRACTION_PATH=/Users/stanley/Code/side project/heptabase-mcp/data/extracted
HEPTABASE_KEEP_EXTRACTED=true
HEPTABASE_MAX_BACKUPS=10
HEPTABASE_CACHE_ENABLED=true
HEPTABASE_CACHE_TTL=3600
HEPTABASE_AUTO_SELECT_LATEST=true
HEPTABASE_DATE_FORMAT=YYYY-MM-DD
HEPTABASE_TIMEZONE=UTC
```

## Verifying Configuration

You can test the server by running it directly and checking that it starts without errors:

```bash
npm start
```

**Note**: The server no longer outputs startup messages to stdout to comply with the MCP protocol. It will silently start and be ready to handle MCP messages.