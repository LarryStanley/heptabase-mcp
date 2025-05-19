#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { HeptabaseMcpServer } from './server';

// Load environment variables from .env file
dotenv.config();

// Start the server when this file is run directly
if (require.main === module) {
  const server = new HeptabaseMcpServer();
  server.initialize()
    .then(() => server.start())
    .then(() => {
      // Keep the process running (no stdout output for MCP protocol)
      process.on('SIGINT', () => {
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        process.exit(0);
      });
    })
    .catch((error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
}

export { HeptabaseMcpServer };
export * from './types/heptabase';
export * from './services/BackupManager';