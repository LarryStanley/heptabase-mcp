#!/usr/bin/env node
const path = require('path');
const fs = require('fs-extra');
const unzipper = require('unzipper');

async function testIssue() {
  console.log('\n=== HEPTABASE MCP DEBUG TEST ===\n');
  
  // Step 1: Check environment
  console.log('1. Environment Variables:');
  console.log('   HEPTABASE_BACKUP_PATH:', process.env.HEPTABASE_BACKUP_PATH || 'NOT SET');
  
  const backupPath = process.env.HEPTABASE_BACKUP_PATH;
  if (!backupPath) {
    console.error('\nERROR: HEPTABASE_BACKUP_PATH environment variable not set');
    console.log('Please set: export HEPTABASE_BACKUP_PATH=/path/to/your/heptabase/backups');
    return;
  }
  
  // Step 2: Check backup directory
  console.log('\n2. Checking backup directory:');
  console.log('   Path:', backupPath);
  
  const backupExists = await fs.pathExists(backupPath);
  console.log('   Exists:', backupExists);
  
  if (!backupExists) {
    console.error('   ERROR: Backup path does not exist');
    return;
  }
  
  const files = await fs.readdir(backupPath);
  console.log('   Files found:', files.length);
  
  const zipFiles = files.filter(f => f.endsWith('.zip'));
  console.log('   ZIP files:', zipFiles.length);
  
  if (zipFiles.length === 0) {
    console.error('   ERROR: No ZIP files found in backup directory');
    return;
  }
  
  // Step 3: Check first ZIP file
  const firstZip = zipFiles[0];
  const zipPath = path.join(backupPath, firstZip);
  console.log('\n3. Examining ZIP file:');
  console.log('   File:', firstZip);
  
  const stats = await fs.stat(zipPath);
  console.log('   Size:', (stats.size / (1024 * 1024)).toFixed(2), 'MB');
  
  // Step 4: Check extraction
  const extractPath = path.join(process.cwd(), 'data', 'extracted', path.basename(firstZip, '.zip'));
  console.log('\n4. Extraction details:');
  console.log('   Target path:', extractPath);
  
  const isExtracted = await fs.pathExists(extractPath);
  console.log('   Already extracted:', isExtracted);
  
  if (!isExtracted) {
    console.log('   Extracting...');
    try {
      await fs.ensureDir(extractPath);
      await fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: extractPath }))
        .promise();
      console.log('   Extraction complete');
    } catch (error) {
      console.error('   ERROR extracting:', error.message);
      return;
    }
  }
  
  // Step 5: Check extracted files
  console.log('\n5. Checking extracted files:');
  const extractedFiles = await fs.readdir(extractPath);
  console.log('   Files:', extractedFiles);
  
  // Step 6: Check JSON structure
  console.log('\n6. Checking JSON file structure:');
  
  const jsonFiles = [
    'whiteboard.json',
    'card.json',
    'card-Instance.json',
    'connection.json'
  ];
  
  for (const jsonFile of jsonFiles) {
    const jsonPath = path.join(extractPath, jsonFile);
    console.log(`\n   ${jsonFile}:`);
    
    if (await fs.pathExists(jsonPath)) {
      try {
        const data = await fs.readJson(jsonPath);
        console.log(`   - Exists: true`);
        console.log(`   - Type: ${Array.isArray(data) ? 'Array' : typeof data}`);
        
        if (Array.isArray(data)) {
          console.log(`   - Count: ${data.length}`);
          if (data.length > 0) {
            console.log(`   - First item keys: ${Object.keys(data[0]).join(', ')}`);
            
            // Show sample for whiteboard
            if (jsonFile === 'whiteboard.json' && data[0]) {
              console.log(`   - Sample:`, {
                id: data[0].id,
                name: data[0].name,
                createdTime: data[0].createdTime
              });
            }
          }
        }
      } catch (error) {
        console.log(`   - ERROR reading: ${error.message}`);
      }
    } else {
      console.log(`   - Exists: false`);
    }
  }
  
  // Step 7: Test with the actual service
  console.log('\n7. Testing with MCP server:');
  try {
    const { HeptabaseMcpServer } = require('./dist/server.js');
    const { HeptabaseDataService } = require('./dist/services/HeptabaseDataService.js');
    
    const server = new HeptabaseMcpServer();
    server.config.backupPath = backupPath;
    server.config.extractionPath = path.join(process.cwd(), 'data', 'extracted');
    
    // Initialize backup manager
    const { BackupManager } = require('./dist/services/BackupManager.js');
    server.backupManager = new BackupManager({
      backupPath: server.config.backupPath,
      extractionPath: server.config.extractionPath,
      autoExtract: true,
      watchDirectory: false,
      keepExtracted: true,
      maxBackups: 10
    });
    
    // Load backup
    const metadata = await server.backupManager.loadBackup(zipPath);
    console.log('   Backup loaded:', metadata.backupId);
    console.log('   Extracted path:', metadata.extractedPath);
    
    // Initialize data service
    if (metadata.extractedPath) {
      server.dataService = new HeptabaseDataService({
        dataPath: metadata.extractedPath,
        cacheEnabled: true,
        cacheTTL: 3600
      });
      
      await server.dataService.loadData();
      console.log('   Data service loaded');
      
      const data = server.dataService.getData();
      console.log('   Data counts:');
      console.log(`   - Whiteboards: ${Object.keys(data.whiteboards).length}`);
      console.log(`   - Cards: ${Object.keys(data.cards).length}`);
      console.log(`   - Card instances: ${Object.keys(data.cardInstances).length}`);
      console.log(`   - Connections: ${Object.keys(data.connections).length}`);
      
      // Try to get a specific whiteboard
      const whiteboardId = '5bb10dc1-a6e0-4f76-ad54-ea09e7c5d29b';
      console.log(`\n   Looking for whiteboard: ${whiteboardId}`);
      
      if (data.whiteboards[whiteboardId]) {
        console.log('   FOUND!', data.whiteboards[whiteboardId]);
      } else {
        console.log('   NOT FOUND');
        console.log('   Available whiteboard IDs:');
        Object.keys(data.whiteboards).slice(0, 5).forEach(id => {
          console.log(`   - ${id}: ${data.whiteboards[id].name}`);
        });
      }
    }
  } catch (error) {
    console.error('   ERROR:', error.message);
    console.error(error.stack);
  }
  
  console.log('\n=== END DEBUG TEST ===\n');
}

testIssue().catch(console.error);