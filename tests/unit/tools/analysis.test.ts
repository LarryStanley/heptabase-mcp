import { HeptabaseMcpServer } from '@/server';
import { HeptabaseDataService } from '@/services/HeptabaseDataService';
import { BackupManager } from '@/services/BackupManager';

jest.mock('@/services/HeptabaseDataService');
jest.mock('@/services/BackupManager');
jest.mock('fs', () => ({
  native: {},
  promises: {
    readdir: jest.fn().mockResolvedValue([]),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
  }
}));
jest.mock('fs-extra', () => ({
  createReadStream: jest.fn(),
  createWriteStream: jest.fn(),
  ensureDir: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(true),
  readdir: jest.fn().mockResolvedValue([]),
  stat: jest.fn().mockResolvedValue({ size: 1000 }),
  readJson: jest.fn().mockResolvedValue({}),
  outputJson: jest.fn().mockResolvedValue(undefined)
}));

type MockedDataService = jest.Mocked<HeptabaseDataService>;
type MockedBackupManager = jest.Mocked<BackupManager>;

// Test data
const mockWhiteboard = {
  id: 'wb1',
  name: 'Test Whiteboard',
  createdBy: 'user1',
  createdTime: '2024-01-01T00:00:00Z',
  lastEditedTime: '2024-01-02T00:00:00Z',
  spaceId: 'space1',
  isTrashed: false
};

const mockCard = {
  id: 'card1',
  title: 'Test Card',
  content: '{"text": "Test content"}',
  createdBy: 'user1',
  createdTime: '2024-01-01T00:00:00Z',
  lastEditedTime: '2024-01-02T00:00:00Z',
  spaceId: 'space1',
  isTrashed: false
};

const mockConnection = {
  id: 'conn1',
  whiteboardId: 'wb1',
  beginId: 'card1',
  beginObjectType: 'card',
  endId: 'card2',
  endObjectType: 'card',
  color: '#000000',
  lineStyle: 'solid',
  type: 'connection',
  createdBy: 'user1',
  createdTime: '2024-01-01T00:00:00Z'
};

describe('Analysis Tools', () => {
  let server: HeptabaseMcpServer;
  let mockDataService: MockedDataService;
  let mockBackupManager: MockedBackupManager;

  beforeEach(() => {
    server = new HeptabaseMcpServer();
    mockDataService = HeptabaseDataService.prototype as MockedDataService;
    mockBackupManager = BackupManager.prototype as MockedBackupManager;
    server['dataService'] = mockDataService;
    server['backupManager'] = mockBackupManager;
    server.initialize();
  });

  describe('analyzeGraph tool', () => {
    it('should analyze knowledge graph structure', async () => {
      mockDataService.getWhiteboards.mockResolvedValue([mockWhiteboard]);
      mockDataService.getCards.mockResolvedValue([mockCard]);
      mockDataService.getConnections.mockResolvedValue([mockConnection]);

      const result = await server.tools.analyzeGraph.handler({});

      expect(mockDataService.getWhiteboards).toHaveBeenCalled();
      expect(mockDataService.getCards).toHaveBeenCalled();
      expect(mockDataService.getConnections).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Knowledge Graph Analysis');
      expect(result.content[0].text).toContain('Total nodes: 1');
    });

    it('should calculate centrality metrics', async () => {
      mockDataService.getWhiteboards.mockResolvedValue([mockWhiteboard]);
      mockDataService.getCards.mockResolvedValue([mockCard, { ...mockCard, id: 'card2' }]);
      mockDataService.getConnections.mockResolvedValue([mockConnection]);

      const params = {
        metrics: ['centrality', 'clustering']
      };

      const result = await server.tools.analyzeGraph.handler(params);

      expect(result.content[0].text).toContain('Centrality');
      expect(result.content[0].text).toContain('Most central nodes');
    });

    it('should analyze specific whiteboard', async () => {
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard,
        cards: [mockCard],
        connections: [mockConnection]
      });

      const params = {
        whiteboardId: 'wb1'
      };

      const result = await server.tools.analyzeGraph.handler(params);

      expect(mockDataService.getWhiteboard).toHaveBeenCalledWith('wb1', {
        includeCards: true,
        includeConnections: true
      });
      expect(result.content[0].text).toContain('Test Whiteboard');
    });

    it('should export analysis report', async () => {
      mockDataService.getWhiteboards.mockResolvedValue([mockWhiteboard]);
      mockDataService.getCards.mockResolvedValue([mockCard]);
      mockDataService.getConnections.mockResolvedValue([mockConnection]);

      const params = {
        exportPath: '/test/analysis.json'
      };

      const result = await server.tools.analyzeGraph.handler(params);

      expect(result.content[0].text).toContain('Analysis saved to /test/analysis.json');
    });
  });

  describe('compareBackups tool', () => {
    it('should compare two backups', async () => {
      const backup1 = {
        backupId: 'backup1',
        backupPath: '/path/to/backup1.zip',
        createdDate: new Date('2024-01-01'),
        fileSize: 1000,
        isCompressed: true
      };

      const backup2 = {
        backupId: 'backup2',
        backupPath: '/path/to/backup2.zip',
        createdDate: new Date('2024-01-02'),
        fileSize: 1200,
        isCompressed: true
      };

      mockBackupManager.getBackupMetadata.mockResolvedValueOnce(backup1);
      mockBackupManager.getBackupMetadata.mockResolvedValueOnce(backup2);
      
      // Mock data service for each backup
      mockDataService.getCards.mockResolvedValueOnce([mockCard]);
      mockDataService.getCards.mockResolvedValueOnce([mockCard, { ...mockCard, id: 'card2', title: 'New Card' }]);
      mockDataService.getWhiteboards.mockResolvedValueOnce([mockWhiteboard]);
      mockDataService.getWhiteboards.mockResolvedValueOnce([mockWhiteboard, { ...mockWhiteboard, id: 'wb2', name: 'New Whiteboard' }]);

      const params = {
        backupId1: 'backup1',
        backupId2: 'backup2'
      };

      const result = await server.tools.compareBackups.handler(params);

      expect(mockBackupManager.getBackupMetadata).toHaveBeenCalledWith('backup1');
      expect(mockBackupManager.getBackupMetadata).toHaveBeenCalledWith('backup2');
      expect(result.content[0].text).toContain('Comparison Results');
      expect(result.content[0].text).toContain('Added: 1 cards');
      expect(result.content[0].text).toContain('Added: 1 whiteboards');
    });

    it('should analyze changes in specific whiteboard', async () => {
      const backup1 = {
        backupId: 'backup1',
        backupPath: '/path/to/backup1.zip',
        createdDate: new Date('2024-01-01'),
        fileSize: 1000,
        isCompressed: true
      };

      const backup2 = {
        backupId: 'backup2',
        backupPath: '/path/to/backup2.zip',
        createdDate: new Date('2024-01-02'),
        fileSize: 1200,
        isCompressed: true
      };

      mockBackupManager.getBackupMetadata.mockResolvedValueOnce(backup1);
      mockBackupManager.getBackupMetadata.mockResolvedValueOnce(backup2);
      
      mockDataService.getWhiteboard.mockResolvedValueOnce({
        whiteboard: mockWhiteboard,
        cards: [mockCard],
        connections: []
      });
      mockDataService.getWhiteboard.mockResolvedValueOnce({
        whiteboard: mockWhiteboard,
        cards: [mockCard, { ...mockCard, id: 'card2' }],
        connections: [mockConnection]
      });

      const params = {
        backupId1: 'backup1',
        backupId2: 'backup2',
        whiteboardId: 'wb1'
      };

      const result = await server.tools.compareBackups.handler(params);

      expect(result.content[0].text).toContain('Test Whiteboard');
      expect(result.content[0].text).toContain('Added: 1 cards');
    });

    it('should export comparison report', async () => {
      const backup1 = {
        backupId: 'backup1',
        backupPath: '/path/to/backup1.zip',
        createdDate: new Date('2024-01-01'),
        fileSize: 1000,
        isCompressed: true
      };

      const backup2 = {
        backupId: 'backup2',
        backupPath: '/path/to/backup2.zip',
        createdDate: new Date('2024-01-02'),
        fileSize: 1200,
        isCompressed: true
      };

      mockBackupManager.getBackupMetadata.mockResolvedValueOnce(backup1);
      mockBackupManager.getBackupMetadata.mockResolvedValueOnce(backup2);
      mockDataService.getCards.mockResolvedValue([]);
      mockDataService.getWhiteboards.mockResolvedValue([]);

      const params = {
        backupId1: 'backup1',
        backupId2: 'backup2',
        exportPath: '/test/comparison.json'
      };

      const result = await server.tools.compareBackups.handler(params);

      expect(result.content[0].text).toContain('Comparison saved to /test/comparison.json');
    });
  });

  describe('tool schemas', () => {
    it('should have valid analyzeGraph schema', () => {
      const schema = server.tools.analyzeGraph.inputSchema.parse({});

      expect(schema).toBeDefined();
    });

    it('should validate metrics array in analyzeGraph', () => {
      const schema = server.tools.analyzeGraph.inputSchema.parse({
        metrics: ['centrality', 'clustering']
      });

      expect(schema.metrics).toEqual(['centrality', 'clustering']);
    });

    it('should have valid compareBackups schema', () => {
      const schema = server.tools.compareBackups.inputSchema.parse({
        backupId1: 'backup1',
        backupId2: 'backup2'
      });

      expect(schema.backupId1).toBe('backup1');
      expect(schema.backupId2).toBe('backup2');
    });

    it('should validate optional parameters in compareBackups', () => {
      const schema = server.tools.compareBackups.inputSchema.parse({
        backupId1: 'backup1',
        backupId2: 'backup2',
        whiteboardId: 'wb1',
        exportPath: '/test/output.json'
      });

      expect(schema.whiteboardId).toBe('wb1');
      expect(schema.exportPath).toBe('/test/output.json');
    });
  });
});