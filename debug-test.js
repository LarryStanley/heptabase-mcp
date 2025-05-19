const path = require('path');
const fs = require('fs-extra');

async function debugBackupPath() {
  const backupPath = process.env.HEPTABASE_BACKUP_PATH || '';
  console.log('Backup path:', backupPath);
  
  try {
    if (backupPath) {
      const exists = await fs.pathExists(backupPath);
      console.log('Path exists:', exists);
      
      if (exists) {
        const files = await fs.readdir(backupPath);
        console.log('Files in backup path:', files);
        
        // Check if any zip files exist
        const zipFiles = files.filter(f => f.endsWith('.zip'));
        console.log('Zip files:', zipFiles);
        
        // Try to extract first zip file
        if (zipFiles.length > 0) {
          const firstZip = path.join(backupPath, zipFiles[0]);
          console.log('First zip:', firstZip);
          
          // Check extraction path
          const extractPath = path.join(process.cwd(), 'data', 'extracted', path.basename(firstZip, '.zip'));
          console.log('Extract path:', extractPath);
          
          // Check if already extracted
          const extractExists = await fs.pathExists(extractPath);
          console.log('Already extracted:', extractExists);
          
          if (extractExists) {
            const extractedFiles = await fs.readdir(extractPath);
            console.log('Extracted files:', extractedFiles);
            
            // Check for JSON files
            const jsonFiles = extractedFiles.filter(f => f.endsWith('.json'));
            console.log('JSON files:', jsonFiles);
            
            // Try to read whiteboard.json
            const whiteboardPath = path.join(extractPath, 'whiteboard.json');
            if (await fs.pathExists(whiteboardPath)) {
              const whiteboards = await fs.readJson(whiteboardPath);
              console.log('Number of whiteboards:', whiteboards.length);
              console.log('First 3 whiteboards:', whiteboards.slice(0, 3).map(wb => ({
                id: wb.id,
                name: wb.name
              })));
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

debugBackupPath();