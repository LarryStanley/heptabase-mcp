import * as fs from 'fs-extra';
import * as path from 'path';
import archiver from 'archiver';

export async function createTestBackup(zipPath: string): Promise<void> {
  // Create temporary directory for test data
  const tempDir = path.join(path.dirname(zipPath), 'temp-test-data');
  await fs.ensureDir(tempDir);

  // Create test data
  const testWhiteboard = {
    id: 'test-wb-1',
    name: 'Test Whiteboard',
    createdBy: 'test-user',
    createdTime: '2024-01-01T00:00:00Z',
    lastEditedTime: '2024-01-02T00:00:00Z',
    spaceId: 'test-space',
    isTrashed: false
  };

  const testCard = {
    id: 'test-card-1',
    title: 'Test Card',
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This is a test card"}]}]}',
    createdBy: 'test-user',
    createdTime: '2024-01-01T00:00:00Z',
    lastEditedTime: '2024-01-02T00:00:00Z',
    spaceId: 'test-space',
    isTrashed: false
  };

  const testInstance = {
    id: 'test-instance-1',
    cardId: 'test-card-1',
    whiteboardId: 'test-wb-1',
    x: 100,
    y: 200,
    width: 300,
    height: 150,
    zIndex: 1,
    color: 'blue',
    isExpanded: true
  };

  const testConnection = {
    id: 'test-conn-1',
    whiteboardId: 'test-wb-1',
    beginId: 'test-card-1',
    beginObjectType: 'card',
    endId: 'test-card-2',
    endObjectType: 'card',
    color: '#000000',
    lineStyle: 'solid',
    type: 'connection',
    createdBy: 'test-user',
    createdTime: '2024-01-01T00:00:00Z'
  };

  // Write test data files
  await fs.outputJson(path.join(tempDir, 'whiteboards.json'), [testWhiteboard]);
  await fs.outputJson(path.join(tempDir, 'cards.json'), [testCard]);
  await fs.outputJson(path.join(tempDir, 'card-instances.json'), [testInstance]);
  await fs.outputJson(path.join(tempDir, 'connections.json'), [testConnection]);

  // Create zip file
  await createZipFile(tempDir, zipPath);

  // Clean up temp directory
  await fs.remove(tempDir);
}

async function createZipFile(sourceDir: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(outputPath);

    stream.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(stream);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}