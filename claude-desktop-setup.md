# Setting up Heptabase MCP with Claude Desktop

## 1. Build the project

```bash
cd /Users/stanley/Code/side\ project/heptabase-mcp
npm install
npm run build
```

## 2. Configure Claude Desktop

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

## 3. Add the MCP server configuration

You have two options for configuring the server:

### Option A: Using npx (recommended)

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
        "HEPTABASE_EXTRACTION_PATH": "/tmp/heptabase-extracted"
      }
    }
  }
}
```

### Option B: Using local development build

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

**Important:** Adjust the paths based on your system:
- Replace `/Users/stanley/.nvm/versions/node/v20.18.0/bin/node` with your Node.js path (find it with `which node`)
- Replace the project path with your actual path
- Set `HEPTABASE_BACKUP_PATH` to your Heptabase backup directory

## 4. Environment Variables

The configuration is now handled through environment variables. You can adjust these values in the Claude Desktop config:

- `HEPTABASE_BACKUP_PATH`: Path to your Heptabase backup directory (required)
- `HEPTABASE_AUTO_EXTRACT`: Set to "true" to automatically extract zip files
- `HEPTABASE_WATCH_DIRECTORY`: Set to "true" to watch for new backups
- `HEPTABASE_EXTRACTION_PATH`: Where to extract zip files

See [ENV_SETUP.md](./ENV_SETUP.md) for all available environment variables.

## 5. Restart Claude Desktop

Quit and restart Claude Desktop for the changes to take effect.

## 6. Test the connection

In Claude Desktop, you should now be able to use Heptabase commands:

```
Can you list my Heptabase backups?
```

```
Search for whiteboards containing "project planning"
```

```
Show me the cards in my "Ideas" whiteboard
```

## Troubleshooting

If the MCP server doesn't connect:

1. Check the Claude Desktop logs:
   - macOS: `~/Library/Logs/Claude/mcp.log`
   - Windows: `%LOCALAPPDATA%\Claude\logs\mcp.log`

2. Test the server manually:
   ```bash
   cd /Users/stanley/Code/side\ project/heptabase-mcp
   npm start
   ```
   **Note**: The server won't output any messages to stdout (to comply with MCP protocol). If it runs without errors, it's working correctly.

3. Verify your Node.js path:
   ```bash
   which node
   ```

4. Ensure your Heptabase backup directory exists and contains backup files

5. Check for JSON syntax errors in the Claude config file

6. Make sure you've built the project (`npm run build`) before testing

## Common Issues

1. **"Unexpected token" errors**: This usually means there's console output interfering with the MCP protocol. Make sure you're using the latest version which has removed all stdout logging.

2. **Server not found**: Verify the paths in your config match your system. On macOS with nvm, the path is usually `/Users/<username>/.nvm/versions/node/<version>/bin/node`

3. **No backups found**: Make sure `HEPTABASE_BACKUP_PATH` points to the directory containing your Heptabase backup files (usually `.heptabase-backup-journal-*` files)