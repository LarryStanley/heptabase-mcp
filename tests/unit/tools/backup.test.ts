import { HeptabaseMcpServer } from '@/server';
import { BackupManager } from '@/services/BackupManager';
import { HeptabaseDataService } from '@/services/HeptabaseDataService';
import { z } from 'zod';

jest.mock('@/services/BackupManager');
jest.mock('@/services/HeptabaseDataService');

describe('Backup Management Tools', () => {
  let server: HeptabaseMcpServer;
  let mockBackupManager: jest.Mocked<BackupManager>;
  let mockDataService: jest.Mocked<HeptabaseDataService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockBackupManager = {
      config: {
        backupPath: '/test/path',
        extractionPath: '/test/extract',
        autoExtract: true,
        watchDirectory: false,
        keepExtracted: true
      },
      listBackups: jest.fn(),
      loadBackup: jest.fn(),
      startWatching: jest.fn(),
      stopWatching: jest.fn(),
      cleanupOldBackups: jest.fn()
    } as any;

    mockDataService = {
      config: {
        dataPath: '/test/data',
        cacheEnabled: true,
        cacheTTL: 3600
      },
      loadData: jest.fn(),
      searchWhiteboards: jest.fn(),
      searchCards: jest.fn(),
      getWhiteboard: jest.fn(),
      getCard: jest.fn(),
      getCardsByArea: jest.fn(),
      getConnections: jest.fn(),
      getData: jest.fn()
    } as any;

    // Initialize server with mocked services
    server = new HeptabaseMcpServer();
    server['backupManager'] = mockBackupManager;
    server['dataService'] = mockDataService;
  });

  describe('configureBackupPath tool', () => {
    it('should configure backup path and update manager', async () => {
      const params = {
        path: '/new/backup/path',
        watchForChanges: true,
        autoExtract: false
      };

      const result = await server.tools.configureBackupPath.handler(params);

      expect(result.content[0].text).toContain('Backup path configured successfully');
      expect(server.config.backupPath).toBe('/new/backup/path');
      expect(server.config.autoExtract).toBe(false);
      expect(server.config.watchDirectory).toBe(true);
      expect(mockBackupManager.startWatching).toHaveBeenCalled();
    });

    it('should validate path parameter', async () => {
      const schema = server.tools.configureBackupPath.inputSchema;
      
      expect(() => schema.parse({ path: '' })).toThrow();
      expect(() => schema.parse({ path: '/valid/path' })).not.toThrow();
    });

    it('should stop watching when watchForChanges is false', async () => {
      const params = {
        path: '/new/backup/path',
        watchForChanges: false
      };

      // Reset mocks since new BackupManager will be created
      mockBackupManager.stopWatching.mockClear();
      mockBackupManager.startWatching.mockClear();

      await server.tools.configureBackupPath.handler(params);

      expect(server.config.watchDirectory).toBe(false);
    });
  });

  describe('listBackups tool', () => {
    it('should list available backups', async () => {
      const mockBackups = [
        {
          backupId: 'backup1',
          backupPath: '/path/backup1.zip',
          createdDate: new Date('2024-01-01'),
          fileSize: 1000000,
          isCompressed: true
        },
        {
          backupId: 'backup2',
          backupPath: '/path/backup2.json',
          createdDate: new Date('2024-01-02'),
          fileSize: 500000,
          isCompressed: false
        }
      ];

      mockBackupManager.listBackups.mockResolvedValue(mockBackups);

      const result = await server.tools.listBackups.handler({});

      expect(result.content[0].text).toContain('2 backups');
      expect(result.content[0].text).toContain('backup1');
      expect(result.content[0].text).toContain('backup2');
    });

    it('should use custom path when provided', async () => {
      mockBackupManager.listBackups.mockResolvedValue([]);

      await server.tools.listBackups.handler({ path: '/custom/path' });

      expect(mockBackupManager.listBackups).toHaveBeenCalledWith('/custom/path');
    });

    it('should sort by date when specified', async () => {
      const mockBackups = [
        {
          backupId: 'backup1',
          backupPath: '/path/backup1.zip',
          createdDate: new Date('2024-01-01'),
          fileSize: 1000000,
          isCompressed: true
        }
      ];

      mockBackupManager.listBackups.mockResolvedValue(mockBackups);

      await server.tools.listBackups.handler({ sortBy: 'date' });

      expect(mockBackupManager.listBackups).toHaveBeenCalled();
    });

    it('should limit results when specified', async () => {
      const mockBackups = Array.from({ length: 10 }, (_, i) => ({
        backupId: `backup${i}`,
        backupPath: `/path/backup${i}.zip`,
        createdDate: new Date(`2024-01-${i + 1}`),
        fileSize: 1000000,
        isCompressed: true
      }));

      mockBackupManager.listBackups.mockResolvedValue(mockBackups);

      const result = await server.tools.listBackups.handler({ limit: 5 });

      expect(result.content[0].text).toContain('5 backups');
    });
  });

  describe('loadBackup tool', () => {
    it('should load backup by path', async () => {
      const mockMetadata = {
        backupId: 'backup1',
        backupPath: '/path/backup1.zip',
        createdDate: new Date('2024-01-01'),
        fileSize: 1000000,
        isCompressed: true,
        extractedPath: '/extracted/backup1'
      };

      mockBackupManager.loadBackup.mockResolvedValue(mockMetadata);
      mockDataService.loadData.mockResolvedValue(undefined);

      const result = await server.tools.loadBackup.handler({
        backupPath: '/path/backup1.zip'
      });

      expect(mockBackupManager.loadBackup).toHaveBeenCalledWith('/path/backup1.zip');
      expect(mockDataService.loadData).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Backup loaded successfully');
    });

    it('should load backup by ID', async () => {
      const mockBackups = [
        {
          backupId: 'backup1',
          backupPath: '/path/backup1.zip',
          createdDate: new Date('2024-01-01'),
          fileSize: 1000000,
          isCompressed: true
        }
      ];

      mockBackupManager.listBackups.mockResolvedValue(mockBackups);
      mockBackupManager.loadBackup.mockResolvedValue(mockBackups[0]);
      mockDataService.loadData.mockResolvedValue(undefined);

      const result = await server.tools.loadBackup.handler({
        backupId: 'backup1'
      });

      expect(mockBackupManager.loadBackup).toHaveBeenCalledWith('/path/backup1.zip');
      expect(result.content[0].text).toContain('Backup loaded successfully');
    });

    it('should extract if specified', async () => {
      const mockMetadata = {
        backupId: 'backup1',
        backupPath: '/path/backup1.zip',
        createdDate: new Date('2024-01-01'),
        fileSize: 1000000,
        isCompressed: true
      };

      mockBackupManager.loadBackup.mockResolvedValue(mockMetadata);
      mockDataService.loadData.mockResolvedValue(undefined);

      await server.tools.loadBackup.handler({
        backupPath: '/path/backup1.zip',
        extract: true
      });

      expect(mockBackupManager.loadBackup).toHaveBeenCalled();
    });

    it('should throw error when backup not found', async () => {
      mockBackupManager.listBackups.mockResolvedValue([]);

      await expect(
        server.tools.loadBackup.handler({ backupId: 'nonexistent' })
      ).rejects.toThrow('Backup not found');
    });

    it('should require either backupPath or backupId', async () => {
      await expect(
        server.tools.loadBackup.handler({})
      ).rejects.toThrow();
    });
  });

  describe('tool schemas', () => {
    it('should have valid configureBackupPath schema', () => {
      const schema = server.tools.configureBackupPath.inputSchema;
      expect(schema).toBeInstanceOf(z.ZodObject);
      
      const validInput = { path: '/test/path' };
      expect(() => schema.parse(validInput)).not.toThrow();
    });

    it('should have valid listBackups schema', () => {
      const schema = server.tools.listBackups.inputSchema;
      expect(schema).toBeInstanceOf(z.ZodObject);
      
      const validInput = { sortBy: 'date', limit: 10 };
      expect(() => schema.parse(validInput)).not.toThrow();
    });

    it('should have valid loadBackup schema', () => {
      const schema = server.tools.loadBackup.inputSchema;
      expect(schema).toBeDefined();
      
      const validInput = { backupPath: '/test/backup.zip' };
      expect(() => schema.parse(validInput)).not.toThrow();
    });
  });
});