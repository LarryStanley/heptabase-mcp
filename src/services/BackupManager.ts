import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';
import unzipper from 'unzipper';
import * as chokidar from 'chokidar';
import { BackupMetadata } from '@/types/heptabase';

export interface BackupManagerConfig {
  backupPath: string;
  extractionPath: string;
  autoExtract: boolean;
  watchDirectory: boolean;
  keepExtracted: boolean;
  maxBackups?: number;
}

export class BackupManager extends EventEmitter {
  public config: BackupManagerConfig;
  private watcher?: chokidar.FSWatcher;
  private loadedBackups: Map<string, BackupMetadata> = new Map();

  constructor(config: BackupManagerConfig) {
    super();
    this.config = config;
  }

  async listBackups(customPath?: string): Promise<BackupMetadata[]> {
    const backupPath = customPath || this.config.backupPath;
    try {
      const files = await fs.readdir(backupPath);
      const backups: BackupMetadata[] = [];

      for (const fileName of files) {
        const filePath = path.join(backupPath, fileName);
        const stats = await fs.stat(filePath);

        if (stats.isFile() && (fileName.endsWith('.zip') || fileName.endsWith('.json'))) {
          const backupInfo = this.getBackupInfo(fileName);
          const metadata: BackupMetadata = {
            backupId: path.basename(fileName, path.extname(fileName)),
            backupPath: filePath,
            createdDate: backupInfo.date,
            fileSize: stats.size,
            isCompressed: fileName.endsWith('.zip'),
            version: backupInfo.version
          };
          backups.push(metadata);
        }
      }

      // Sort by date descending (newest first)
      return backups.sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime());
    } catch (error) {
      throw error;
    }
  }

  async loadBackup(backupPath: string): Promise<BackupMetadata> {
    this.emit('backup:load:start', backupPath);

    try {
      const stats = await fs.stat(backupPath);
      const fileName = path.basename(backupPath);
      const backupInfo = this.getBackupInfo(fileName);
      const isCompressed = fileName.endsWith('.zip');
      
      let extractedPath: string | undefined;
      
      if (isCompressed && this.config.autoExtract) {
        const backupName = path.basename(backupPath, '.zip');
        extractedPath = path.join(this.config.extractionPath, backupName);
        
        // Check if already extracted
        if (!(await fs.pathExists(extractedPath))) {
          await this.extractBackup(backupPath, extractedPath);
        }
      }

      const metadata: BackupMetadata = {
        backupId: path.basename(backupPath, path.extname(backupPath)),
        backupPath,
        createdDate: backupInfo.date,
        fileSize: stats.size,
        isCompressed,
        extractedPath,
        version: backupInfo.version
      };

      this.loadedBackups.set(metadata.backupId, metadata);
      this.emit('backup:load:complete', metadata);
      
      return metadata;
    } catch (error) {
      this.emit('backup:load:error', error);
      throw error;
    }
  }

  async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    // Check if already loaded
    if (this.loadedBackups.has(backupId)) {
      return this.loadedBackups.get(backupId)!;
    }
    
    // Otherwise, search for it in the list
    const backups = await this.listBackups();
    return backups.find(backup => backup.backupId === backupId) || null;
  }

  private async extractBackup(zipPath: string, extractPath: string): Promise<void> {
    // Ensure the extraction directory exists
    await fs.ensureDir(extractPath);
    
    // Ensure parent directory exists
    const parentDir = path.dirname(extractPath);
    await fs.ensureDir(parentDir);
    
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: extractPath }));

      stream.promise()
        .then(() => resolve())
        .catch((error) => reject(error));
    });
  }

  startWatching(): void {
    if (this.watcher) {
      return;
    }

    this.watcher = chokidar.watch(this.config.backupPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true
    });

    this.watcher
      .on('add', (filePath: string) => {
        if (filePath.endsWith('.zip') || filePath.endsWith('.json')) {
          this.emit('backup:new', filePath);
        }
      })
      .on('change', (filePath: string) => {
        if (filePath.endsWith('.zip') || filePath.endsWith('.json')) {
          this.emit('backup:changed', filePath);
        }
      })
      .on('error', (error: unknown) => {
        this.emit('watch:error', error);
      });

    this.emit('watch:started');
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
      this.emit('watch:stopped');
    }
  }

  getBackupInfo(fileName: string): { date: Date; version: string } {
    // Try to extract date from Heptabase filename format
    // Example: Heptabase-Data-Backup-2025-05-18T14-49-23-577Z
    const heptabaseDateMatch = fileName.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-\d{3}Z/);
    if (heptabaseDateMatch) {
      const [, year, month, day, hour, minute, second] = heptabaseDateMatch;
      return {
        date: new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`),
        version: `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
      };
    }
    
    // Try to extract date from generic filename (e.g., backup-2024-01-15.zip)
    const dateMatch = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      return {
        date: new Date(`${year}-${month}-${day}`),
        version: `${year}-${month}-${day}`
      };
    }

    // Try to extract version from filename (e.g., heptabase-backup-v1.2.3.zip)
    const versionMatch = fileName.match(/v(\d+\.\d+\.\d+)/);
    if (versionMatch) {
      return {
        date: new Date(),
        version: versionMatch[0]
      };
    }

    return {
      date: new Date(),
      version: 'unknown'
    };
  }

  async cleanupOldBackups(): Promise<void> {
    if (!this.config.maxBackups) {
      return;
    }

    const backups = await this.listBackups();
    if (backups.length <= this.config.maxBackups) {
      return;
    }

    // Since backups are sorted newest first, remove from the end (oldest)
    const backupsToRemove = backups.slice(this.config.maxBackups);
    
    for (const backup of backupsToRemove) {
      try {
        await fs.remove(backup.backupPath);
        if (backup.extractedPath) {
          await fs.remove(backup.extractedPath);
        }
        this.emit('backup:removed', backup);
      } catch (error) {
        this.emit('backup:remove:error', { backup, error });
      }
    }
  }
}