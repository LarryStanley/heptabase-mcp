const fs = require('fs-extra');
const path = require('path');

async function checkJsonStructure() {
  try {
    const extractPath = path.join(process.cwd(), 'data', 'extracted');
    console.log('Checking extraction path:', extractPath);
    
    if (!(await fs.pathExists(extractPath))) {
      console.log('Extraction path does not exist');
      return;
    }
    
    const dirs = await fs.readdir(extractPath);
    console.log('Subdirectories:', dirs);
    
    for (const dir of dirs) {
      const dirPath = path.join(extractPath, dir);
      const stats = await fs.stat(dirPath);
      
      if (stats.isDirectory()) {
        console.log(`\nChecking directory: ${dir}`);
        const files = await fs.readdir(dirPath);
        console.log('Files:', files);
        
        // Check for whiteboard.json
        const whiteboardPath = path.join(dirPath, 'whiteboard.json');
        if (await fs.pathExists(whiteboardPath)) {
          const data = await fs.readJson(whiteboardPath);
          console.log('whiteboard.json exists:', Array.isArray(data) ? `Array of ${data.length}` : typeof data);
          
          if (Array.isArray(data) && data.length > 0) {
            console.log('First whiteboard:', JSON.stringify(data[0], null, 2));
          }
        }
        
        // Check for card.json
        const cardPath = path.join(dirPath, 'card.json');
        if (await fs.pathExists(cardPath)) {
          const data = await fs.readJson(cardPath);
          console.log('card.json exists:', Array.isArray(data) ? `Array of ${data.length}` : typeof data);
        }
        
        // Check for card-Instance.json
        const instancePath = path.join(dirPath, 'card-Instance.json');
        if (await fs.pathExists(instancePath)) {
          const data = await fs.readJson(instancePath);
          console.log('card-Instance.json exists:', Array.isArray(data) ? `Array of ${data.length}` : typeof data);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkJsonStructure();