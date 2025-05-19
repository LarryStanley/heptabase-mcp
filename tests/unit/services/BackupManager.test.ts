import { BackupManager } from '@/services/BackupManager';
import { BackupMetadata } from '@/types/heptabase';
import fs from 'fs-extra';
import path from 'path';
import unzipper from 'unzipper';
import { EventEmitter } from 'events';

// Mock modules
jest.mock('fs-extra', () => ({
  readdir: jest.fn(),
  stat: jest.fn(),
  createReadStream: jest.fn(),
  ensureDir: jest.fn(),
  pathExists: jest.fn(),
  remove: jest.fn()
}));

jest.mock('unzipper', () => ({
  Extract: jest.fn()
}));

jest.mock('chokidar');

describe('BackupManager', () => {
  let backupManager: BackupManager;
  const testBackupPath = '/test/backup/path';
  const testExtractionPath = '/test/extraction/path';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    backupManager = new BackupManager({
      backupPath: testBackupPath,
      extractionPath: testExtractionPath,
      autoExtract: true,
      watchDirectory: false,
      keepExtracted: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create instance with provided config', () => {
      expect(backupManager.config.backupPath).toBe(testBackupPath);
      expect(backupManager.config.extractionPath).toBe(testExtractionPath);
      expect(backupManager.config.autoExtract).toBe(true);
    });

    it('should extend EventEmitter', () => {
      expect(backupManager).toBeInstanceOf(EventEmitter);
    });
  });

  describe('listBackups', () => {
    it('should list all backup files in the directory', async () => {
      const mockFiles = [
        'backup-2024-01-01.zip',
        'backup-2024-01-02.zip',
        'backup.json',
        'readme.txt'
      ];

      (fs.readdir as unknown as jest.Mock).mockResolvedValueOnce(mockFiles);
      (fs.stat as unknown as jest.Mock).mockImplementation((filePath) => {
        const fileName = path.basename(filePath as string);
        return Promise.resolve({
          isFile: () => fileName.endsWith('.zip') || fileName.endsWith('.json'),
          size: 1024000,
          mtime: new Date('2024-01-01')
        });
      });

      const backups = await backupManager.listBackups();

      expect(backups).toHaveLength(3);
      expect(backups.map(b => path.basename(b.backupPath))).toEqual(
        expect.arrayContaining([
          'backup-2024-01-01.zip',
          'backup-2024-01-02.zip',
          'backup.json'
        ])
      );
    });

    it('should sort backups by date in descending order', async () => {
      const mockFiles = [
        'backup-2024-01-01.zip',
        'backup-2024-01-03.zip',
        'backup-2024-01-02.zip'
      ];

      (fs.readdir as unknown as jest.Mock).mockResolvedValueOnce(mockFiles);
      (fs.stat as unknown as jest.Mock).mockImplementation((filePath) => {
        const fileName = path.basename(filePath as string);
        const dateStr = fileName.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '2024-01-01';
        return Promise.resolve({
          isFile: () => true,
          size: 1024000,
          mtime: new Date(dateStr)
        });
      });

      const backups = await backupManager.listBackups();

      expect(backups[0].backupPath).toContain('backup-2024-01-03.zip');
      expect(backups[1].backupPath).toContain('backup-2024-01-02.zip');
      expect(backups[2].backupPath).toContain('backup-2024-01-01.zip');
    });

    it('should handle empty directory', async () => {
      (fs.readdir as unknown as jest.Mock).mockResolvedValueOnce([]);

      const backups = await backupManager.listBackups();

      expect(backups).toHaveLength(0);
    });

    it('should handle read errors', async () => {
      (fs.readdir as unknown as jest.Mock).mockRejectedValueOnce(new Error('Directory not found'));

      await expect(backupManager.listBackups()).rejects.toThrow('Directory not found');
    });
  });

  describe('loadBackup', () => {
    const mockBackupPath = path.join(testBackupPath, 'backup-2024-01-01.zip');
    const mockExtractedPath = path.join(testExtractionPath, 'backup-2024-01-01');

    it('should load and extract zip backup when autoExtract is true', async () => {
      const mockStream = {
        pipe: jest.fn().mockReturnThis(),
        promise: jest.fn().mockResolvedValue(undefined)
      };

      (fs.createReadStream as unknown as jest.Mock).mockReturnValueOnce(mockStream);
      (unzipper.Extract as unknown as jest.Mock).mockReturnValueOnce({ on: jest.fn() });
      (fs.ensureDir as unknown as jest.Mock).mockResolvedValueOnce(undefined);
      (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(false);
      (fs.stat as unknown as jest.Mock).mockResolvedValueOnce({ size: 1024000 });

      const metadata = await backupManager.loadBackup(mockBackupPath);

      expect(fs.ensureDir).toHaveBeenCalledWith(mockExtractedPath);
      expect(fs.createReadStream).toHaveBeenCalledWith(mockBackupPath);
      expect(metadata.isCompressed).toBe(true);
      expect(metadata.extractedPath).toBe(mockExtractedPath);
    });

    it('should skip extraction if already extracted', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(true);
      (fs.stat as unknown as jest.Mock).mockResolvedValueOnce({ size: 1024000 });

      const metadata = await backupManager.loadBackup(mockBackupPath);

      expect(fs.createReadStream).not.toHaveBeenCalled();
      expect(metadata.extractedPath).toBe(mockExtractedPath);
    });

    it('should load JSON backup directly', async () => {
      const jsonBackupPath = path.join(testBackupPath, 'backup.json');
      (fs.stat as unknown as jest.Mock).mockResolvedValueOnce({ size: 500000 });

      const metadata = await backupManager.loadBackup(jsonBackupPath);

      expect(metadata.isCompressed).toBe(false);
      expect(metadata.extractedPath).toBeUndefined();
      expect(metadata.fileSize).toBe(500000);
    });

    it('should emit events during loading', async () => {
      const onLoadStart = jest.fn();
      const onLoadComplete = jest.fn();

      backupManager.on('backup:load:start', onLoadStart);
      backupManager.on('backup:load:complete', onLoadComplete);

      (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(true);
      (fs.stat as unknown as jest.Mock).mockResolvedValueOnce({ size: 1024000 });

      await backupManager.loadBackup(mockBackupPath);

      expect(onLoadStart).toHaveBeenCalledWith(mockBackupPath);
      expect(onLoadComplete).toHaveBeenCalledWith(expect.objectContaining({
        backupPath: mockBackupPath
      }));
    });

    it('should handle extraction errors', async () => {
      const mockStream = {
        pipe: jest.fn().mockReturnThis(),
        promise: jest.fn().mockRejectedValue(new Error('Extraction failed'))
      };

      (fs.createReadStream as unknown as jest.Mock).mockReturnValueOnce(mockStream);
      (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(false);
      (fs.ensureDir as unknown as jest.Mock).mockResolvedValueOnce(undefined);
      (fs.stat as unknown as jest.Mock).mockResolvedValueOnce({ size: 1024000 });

      await expect(backupManager.loadBackup(mockBackupPath))
        .rejects.toThrow('Extraction failed');
    });
  });

  describe('watchDirectory', () => {
    it('should start watching directory when enabled', () => {
      const mockWatcher = {
        on: jest.fn().mockReturnThis(),
        close: jest.fn()
      };

      const chokidar = require('chokidar');
      chokidar.watch = jest.fn().mockReturnValue(mockWatcher);

      backupManager.startWatching();

      expect(chokidar.watch).toHaveBeenCalledWith(testBackupPath, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        ignoreInitial: true
      });

      expect(mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should emit event when new backup is detected', (done) => {
      const mockWatcher = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'add') {
            // Simulate file addition
            setTimeout(() => {
              callback(path.join(testBackupPath, 'new-backup.zip'));
            }, 10);
          }
          return mockWatcher;
        }),
        close: jest.fn()
      };

      const chokidar = require('chokidar');
      chokidar.watch = jest.fn().mockReturnValue(mockWatcher);

      backupManager.on('backup:new', (filePath) => {
        expect(filePath).toContain('new-backup.zip');
        done();
      });

      backupManager.startWatching();
    });

    it('should stop watching when requested', () => {
      const mockWatcher = {
        on: jest.fn().mockReturnThis(),
        close: jest.fn()
      };

      const chokidar = require('chokidar');
      chokidar.watch = jest.fn().mockReturnValue(mockWatcher);

      backupManager.startWatching();
      backupManager.stopWatching();

      expect(mockWatcher.close).toHaveBeenCalled();
    });
  });

  describe('getBackupInfo', () => {
    it('should extract version and date from filename', () => {
      const info1 = backupManager.getBackupInfo('backup-2024-01-15.zip');
      expect(info1.date).toEqual(new Date('2024-01-15'));
      expect(info1.version).toBe('2024-01-15');

      const info2 = backupManager.getBackupInfo('heptabase-backup-v1.2.3.zip');
      expect(info2.version).toBe('v1.2.3');
    });

    it('should handle files without clear version/date', () => {
      const info = backupManager.getBackupInfo('backup.json');
      expect(info.version).toBe('unknown');
      expect(info.date).toBeInstanceOf(Date);
    });
  });

  describe('cleanupOldBackups', () => {
    it('should remove old backups exceeding maxBackups limit', async () => {
      const config = {
        ...backupManager.config,
        maxBackups: 2
      };
      backupManager = new BackupManager(config);

      const mockBackups: BackupMetadata[] = [
        {
          backupId: '3',
          backupPath: '/backup3',
          createdDate: new Date('2024-01-03'),
          fileSize: 1000,
          isCompressed: true
        },
        {
          backupId: '2',
          backupPath: '/backup2',
          createdDate: new Date('2024-01-02'),
          fileSize: 1000,
          isCompressed: true
        },
        {
          backupId: '1',
          backupPath: '/backup1',
          createdDate: new Date('2024-01-01'),
          fileSize: 1000,
          isCompressed: true
        }
      ];

      jest.spyOn(backupManager, 'listBackups').mockResolvedValue(mockBackups);
      (fs.remove as unknown as jest.Mock).mockResolvedValue(undefined);

      await backupManager.cleanupOldBackups();

      expect(fs.remove).toHaveBeenCalledWith('/backup1');
      expect(fs.remove).not.toHaveBeenCalledWith('/backup2');
      expect(fs.remove).not.toHaveBeenCalledWith('/backup3');
    });

    it('should not remove backups if under limit', async () => {
      const config = {
        ...backupManager.config,
        maxBackups: 5
      };
      backupManager = new BackupManager(config);

      const mockBackups: BackupMetadata[] = [
        {
          backupId: '1',
          backupPath: '/backup1',
          createdDate: new Date('2024-01-01'),
          fileSize: 1000,
          isCompressed: true
        }
      ];

      jest.spyOn(backupManager, 'listBackups').mockResolvedValue(mockBackups);

      await backupManager.cleanupOldBackups();

      expect(fs.remove).not.toHaveBeenCalled();
    });
  });
});