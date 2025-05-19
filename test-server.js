const path = require('path');
const fs = require('fs-extra');
const { HeptabaseMcpServer } = require('./dist/server.js');

async function testServer() {
  console.log('Creating server instance...');
  const server = new HeptabaseMcpServer();
  
  // Configure backup path
  const backupPath = process.env.HEPTABASE_BACKUP_PATH;
  if (!backupPath) {
    console.error('HEPTABASE_BACKUP_PATH environment variable not set');
    return;
  }
  
  console.log('Backup path:', backupPath);
  
  // Initialize with config
  server.config.backupPath = backupPath;
  await server.initialize();
  
  console.log('Server initialized');
  console.log('Config:', JSON.stringify(server.config, null, 2));
  
  try {
    // List backups
    console.log('\nListing backups...');
    const backups = await server.backupManager.listBackups();
    console.log('Found backups:', backups.length);
    backups.forEach(backup => {
      console.log(`- ${backup.backupId} (${backup.fileSize} bytes, compressed: ${backup.isCompressed})`);
    });
    
    if (backups.length > 0) {
      // Load the latest backup
      console.log('\nLoading latest backup...');
      const latestBackup = backups[0];
      const metadata = await server.backupManager.loadBackup(latestBackup.backupPath);
      console.log('Loaded backup:', metadata.backupId);
      console.log('Extracted path:', metadata.extractedPath);
      
      // Check if data service can be initialized
      if (metadata.extractedPath) {
        console.log('\nInitializing data service...');
        server.dataService = new (require('./dist/services/HeptabaseDataService.js').HeptabaseDataService)({
          dataPath: metadata.extractedPath,
          cacheEnabled: true,
          cacheTTL: 3600
        });
        
        await server.dataService.loadData();
        console.log('Data service loaded');
        
        const data = server.dataService.getData();
        console.log('Data loaded:');
        console.log('- Whiteboards:', Object.keys(data.whiteboards).length);
        console.log('- Cards:', Object.keys(data.cards).length);
        console.log('- Card instances:', Object.keys(data.cardInstances).length);
        console.log('- Connections:', Object.keys(data.connections).length);
        
        // Test searching for whiteboards
        console.log('\nTesting whiteboard search...');
        const whiteboards = await server.dataService.searchWhiteboards({});
        console.log('Found whiteboards:', whiteboards.length);
        whiteboards.slice(0, 3).forEach(wb => {
          console.log(`- ${wb.name} (ID: ${wb.id})`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testServer().catch(console.error);