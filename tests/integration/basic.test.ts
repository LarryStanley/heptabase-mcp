import { HeptabaseMcpServer } from '@/server';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createTestBackup } from '../fixtures/testData';

describe('Basic Integration Tests', () => {
  let server: HeptabaseMcpServer;
  const testDir = path.join(__dirname, '../temp-integration');
  const backupPath = path.join(testDir, 'test-backup.zip');
  const originalEnv = process.env;
  
  beforeAll(async () => {
    // Create test directory and backup
    await fs.ensureDir(testDir);
    await createTestBackup(backupPath);
  });

  afterAll(async () => {
    // Clean up
    await fs.remove(testDir);
    process.env = originalEnv;
  });

  beforeEach(() => {
    server = new HeptabaseMcpServer();
    // Reset environment for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Clean up env vars
    delete process.env.HEPTABASE_BACKUP_PATH;
    delete process.env.HEPTABASE_AUTO_EXTRACT;
    delete process.env.HEPTABASE_EXTRACTION_PATH;
  });

  it('should complete a basic workflow', async () => {
    // Use a different approach to ensure clean initialization
    server = new HeptabaseMcpServer();
    
    // Set environment variables for this test
    process.env.HEPTABASE_BACKUP_PATH = testDir;
    process.env.HEPTABASE_AUTO_EXTRACT = 'true';
    process.env.HEPTABASE_EXTRACTION_PATH = path.join(testDir, 'extracted');
    
    // Set the config file path to a non-existent file
    (server as any).configPath = path.join(testDir, 'non-existent-config.json');
    
    await server.initialize();
    
    // List backups should work now
    const listResult = await server.tools.listBackups.handler({});
    expect(listResult.content[0].text).toContain('test-backup');
    
    // Load backup
    const loadResult = await server.tools.loadBackup.handler({
      backupPath: backupPath
    });
    expect(loadResult.content[0].text).toContain('Backup loaded successfully');
    
    // Search whiteboards
    const searchResult = await server.tools.searchWhiteboards.handler({
      query: 'test'
    });
    expect(searchResult.content[0].text).toContain('Found');
    
    // Get whiteboard details
    const whiteboards = await server['dataService']?.searchWhiteboards({ query: 'test' });
    if (whiteboards && whiteboards.length > 0) {
      const whiteboardResult = await server.tools.getWhiteboard.handler({
        whiteboardId: whiteboards[0].id
      });
      expect(whiteboardResult.content[0].text).toContain('Whiteboard:');
    }
  });

  it('should handle export functionality', async () => {
    // Create fresh server instance with proper configuration
    server = new HeptabaseMcpServer();
    
    // Set environment variables for this test
    process.env.HEPTABASE_BACKUP_PATH = testDir;
    process.env.HEPTABASE_AUTO_EXTRACT = 'true';
    process.env.HEPTABASE_EXTRACTION_PATH = path.join(testDir, 'extracted');
    
    // Set the config file path to a non-existent file
    (server as any).configPath = path.join(testDir, 'non-existent-config.json');
    
    await server.initialize();
    
    // Load backup
    await server.tools.loadBackup.handler({ backupPath });
    
    // Export a whiteboard
    const whiteboards = await server['dataService']?.searchWhiteboards({ query: '' });
    if (whiteboards && whiteboards.length > 0) {
      const exportPath = path.join(testDir, 'export.md');
      const exportResult = await server.tools.exportWhiteboard.handler({
        whiteboardId: whiteboards[0].id,
        outputPath: exportPath
      });
      expect(exportResult.content[0].text).toContain('Exported whiteboard');
      
      // Verify file was created
      const exists = await fs.pathExists(exportPath);
      expect(exists).toBe(true);
    }
  });

  it('should handle analysis functionality', async () => {
    // Create fresh server instance with proper configuration
    server = new HeptabaseMcpServer();
    
    // Set environment variables for this test
    process.env.HEPTABASE_BACKUP_PATH = testDir;
    process.env.HEPTABASE_AUTO_EXTRACT = 'true';
    process.env.HEPTABASE_EXTRACTION_PATH = path.join(testDir, 'extracted');
    
    // Set the config file path to a non-existent file
    (server as any).configPath = path.join(testDir, 'non-existent-config.json');
    
    await server.initialize();
    
    // Load backup
    await server.tools.loadBackup.handler({ backupPath });
    
    // Analyze knowledge graph
    const analysisResult = await server.tools.analyzeGraph.handler({});
    expect(analysisResult.content[0].text).toContain('Knowledge Graph Analysis');
    expect(analysisResult.content[0].text).toContain('Total nodes:');
  });
});