# Configuration Files

This directory contains several configuration file types:

## Public (Safe for Git)
- `claude-config-example.json` - Template for local development setup
- `claude-config-npx.json` - Template for NPX setup 
- `.mcp-settings.example.json` - Template for MCP settings

## Private (Gitignored)
- `claude-config-*personal*.json` - Your actual config files with real paths
- `.mcp-settings.json` - Your actual MCP settings
- Any `.env` files

## Usage

1. Copy the example files to create your personal versions:
   ```bash
   cp claude-config-npx.json claude-config-npx-personal.json
   ```

2. Edit the personal files with your actual paths:
   ```json
   {
     "env": {
       "HEPTABASE_BACKUP_PATH": "/Users/yourusername/Documents/Heptabase-auto-backup"
     }
   }
   ```

3. Use the personal files for your Claude Desktop configuration.

The personal files are automatically ignored by git to protect your privacy.
