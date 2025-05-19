import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fs from 'fs-extra';
import path from 'path';
import { z } from 'zod';
import { BackupManager } from './services/BackupManager';
import { HeptabaseDataService } from './services/HeptabaseDataService';
import { parseHeptabaseContentToMarkdown, parseHeptabaseContentToHtml } from './utils/contentParser';

export interface HeptabaseConfig {
  backupPath: string;
  autoExtract: boolean;
  watchDirectory: boolean;
  extractionPath: string;
  keepExtracted: boolean;
  maxBackups: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  autoSelectLatest: boolean;
  dateFormat: string;
  timezone: string;
}

interface Tool {
  inputSchema: z.ZodSchema<any>;
  handler: (params: any) => Promise<any>;
}

export class HeptabaseMcpServer {
  public server: McpServer;
  public config: HeptabaseConfig;
  public readonly serverName = 'Heptabase MCP';
  public readonly serverVersion = '1.0.0';
  public tools: Record<string, Tool> = {};
  public backupManager?: BackupManager;
  public dataService?: HeptabaseDataService;
  
  private configPath = '.mcp-settings.json';

  constructor() {
    this.server = new McpServer({
      name: this.serverName,
      version: this.serverVersion
    });
    
    this.config = this.getDefaultConfig();
    this.registerTools();
  }

  private registerTools(): void {
    // Backup management tools
    this.registerBackupTools();
    
    // Search tools
    this.registerSearchTools();
    
    // Data retrieval tools
    this.registerDataTools();
    
    // Export tools
    this.registerExportTools();
    
    // Analysis tools
    this.registerAnalysisTools();
    
    // Debug tools
    this.registerDebugTools();
  }
  
  private async ensureDataServiceInitialized(): Promise<void> {
    if (this.dataService) {
      return;
    }
    
    if (!this.backupManager) {
      throw new Error('Backup manager not initialized. Please configure backup path first.');
    }
    
    // Try to auto-load the latest backup
    const backups = await this.backupManager.listBackups();
    if (backups.length === 0) {
      throw new Error('No backups found. Please ensure backup path is configured correctly.');
    }
    
    // Load the latest backup automatically
    const latestBackup = backups[0]; // Already sorted by date descending
    const metadata = await this.backupManager.loadBackup(latestBackup.backupPath);
    
    // Initialize data service with the extracted path
    const dataPath = metadata.extractedPath || path.dirname(metadata.backupPath);
    
    this.dataService = new HeptabaseDataService({
      dataPath,
      cacheEnabled: this.config.cacheEnabled,
      cacheTTL: this.config.cacheTTL
    });
    await this.dataService.loadData();
  }

  private registerBackupTools(): void {
    // configureBackupPath
    const configureBackupPathSchema = z.object({
      path: z.string().min(1),
      watchForChanges: z.boolean().optional(),
      autoExtract: z.boolean().optional()
    });

    this.tools.configureBackupPath = {
      inputSchema: configureBackupPathSchema,
      handler: async (params) => {
        this.config.backupPath = params.path;
        
        if (params.autoExtract !== undefined) {
          this.config.autoExtract = params.autoExtract;
        }

        if (params.watchForChanges !== undefined) {
          this.config.watchDirectory = params.watchForChanges;
        }

        // Update existing backup manager config if it exists
        if (this.backupManager) {
          this.backupManager.config.backupPath = this.config.backupPath;
          this.backupManager.config.autoExtract = this.config.autoExtract;
          this.backupManager.config.watchDirectory = this.config.watchDirectory;
          
          if (this.config.watchDirectory) {
            this.backupManager.startWatching();
          } else {
            this.backupManager.stopWatching();
          }
        } else {
          // Create new backup manager if it doesn't exist
          this.backupManager = new BackupManager({
            backupPath: this.config.backupPath,
            extractionPath: this.config.extractionPath,
            autoExtract: this.config.autoExtract,
            watchDirectory: this.config.watchDirectory,
            keepExtracted: this.config.keepExtracted,
            maxBackups: this.config.maxBackups
          });

          if (this.config.watchDirectory) {
            this.backupManager.startWatching();
          }
        }

        // Don't save configuration to file in MCP mode to avoid EROFS errors
        // Configuration is managed through environment variables

        return {
          content: [{
            type: 'text',
            text: `Backup path configured successfully: ${params.path}`
          }]
        };
      }
    };

    this.server.tool('configureBackupPath', configureBackupPathSchema.shape, async (params) => {
      return this.tools.configureBackupPath.handler(params);
    });

    // listBackups
    const listBackupsSchema = z.object({
      path: z.string().optional(),
      sortBy: z.enum(['date', 'size']).optional(),
      limit: z.number().optional()
    });

    this.tools.listBackups = {
      inputSchema: listBackupsSchema,
      handler: async (params) => {
        if (!this.backupManager) {
          this.backupManager = new BackupManager({
            backupPath: params.path || this.config.backupPath,
            extractionPath: this.config.extractionPath,
            autoExtract: this.config.autoExtract,
            watchDirectory: false,
            keepExtracted: this.config.keepExtracted
          });
        }

        const backups = await this.backupManager.listBackups(params.path);
        let result = backups;

        if (params.sortBy === 'size') {
          result = result.sort((a, b) => b.fileSize - a.fileSize);
        }

        if (params.limit) {
          result = result.slice(0, params.limit);
        }

        const text = `Found ${result.length} backups:\n` +
          result.map(b => `- ${b.backupId} (${b.fileSize} bytes, ${b.createdDate})`).join('\n');

        return {
          content: [{
            type: 'text',
            text
          }]
        };
      }
    };

    this.server.tool('listBackups', listBackupsSchema.shape, async (params) => {
      return this.tools.listBackups.handler(params);
    });

    // loadBackup
    const loadBackupSchema = z.object({
      backupPath: z.string().optional(),
      backupId: z.string().optional(),
      extract: z.boolean().optional()
    }).refine(data => data.backupPath || data.backupId, {
      message: 'Either backupPath or backupId must be provided'
    });

    this.tools.loadBackup = {
      inputSchema: loadBackupSchema,
      handler: async (params) => {
        if (!this.backupManager) {
          this.backupManager = new BackupManager({
            backupPath: this.config.backupPath,
            extractionPath: this.config.extractionPath,
            autoExtract: params.extract ?? this.config.autoExtract,
            watchDirectory: false,
            keepExtracted: this.config.keepExtracted
          });
        }

        let backupPath = params.backupPath;

        // If backupId is provided, find the backup path
        if (params.backupId) {
          const backups = await this.backupManager.listBackups();
          const backup = backups.find(b => b.backupId === params.backupId);
          if (!backup) {
            throw new Error('Backup not found');
          }
          backupPath = backup.backupPath;
        }

        const metadata = await this.backupManager.loadBackup(backupPath!);

        // Initialize data service with the extracted path
        const dataPath = metadata.extractedPath || path.dirname(metadata.backupPath);
        
        // Update existing data service if it exists, otherwise create new one
        if (this.dataService) {
          // Update the data path and reload
          (this.dataService as any).config.dataPath = dataPath;
          await this.dataService.loadData();
        } else {
          this.dataService = new HeptabaseDataService({
            dataPath,
            cacheEnabled: this.config.cacheEnabled,
            cacheTTL: this.config.cacheTTL
          });
          await this.dataService.loadData();
        }

        return {
          content: [{
            type: 'text',
            text: `Backup loaded successfully: ${metadata.backupId}`
          }]
        };
      }
    };

    this.server.tool('loadBackup', {
      backupPath: z.string().optional(),
      backupId: z.string().optional(),
      extract: z.boolean().optional()
    }, async (params) => {
      const validated = loadBackupSchema.parse(params);
      return this.tools.loadBackup.handler(validated);
    });
  }

  private registerSearchTools(): void {
    // searchWhiteboards
    const searchWhiteboardsSchema = z.object({
      query: z.string().optional(),
      dateRange: z.object({
        start: z.string(),
        end: z.string()
      }).optional(),
      hasCards: z.boolean().optional(),
      spaceId: z.string().optional()
    });

    this.tools.searchWhiteboards = {
      inputSchema: searchWhiteboardsSchema,
      handler: async (params) => {
        await this.ensureDataServiceInitialized();

        const searchQuery: any = {};
        
        if (params.query) {
          searchQuery.query = params.query;
        }
        
        if (params.dateRange) {
          searchQuery.dateRange = {
            start: new Date(params.dateRange.start),
            end: new Date(params.dateRange.end)
          };
        }
        
        if (params.hasCards !== undefined) {
          searchQuery.hasCards = params.hasCards;
        }
        
        if (params.spaceId) {
          searchQuery.spaceId = params.spaceId;
        }

        const results = await this.dataService!.searchWhiteboards(searchQuery);
        
        const text = `Found ${results.length} whiteboards${results.length > 0 ? ':\n' : ''}` +
          results.map(wb => `- ${wb.name} (ID: ${wb.id}, Last edited: ${wb.lastEditedTime})`).join('\n');

        return {
          content: [{
            type: 'text',
            text
          }]
        };
      }
    };

    this.server.tool('searchWhiteboards', searchWhiteboardsSchema.shape, async (params) => {
      return this.tools.searchWhiteboards.handler(params);
    });

    // searchCards
    const searchCardsSchema = z.object({
      query: z.string().optional(),
      tags: z.array(z.string()).optional(),
      whiteboardId: z.string().optional(),
      contentType: z.enum(['text', 'image', 'link']).optional(),
      dateRange: z.object({
        start: z.string(),
        end: z.string()
      }).optional()
    });

    this.tools.searchCards = {
      inputSchema: searchCardsSchema,
      handler: async (params) => {
        await this.ensureDataServiceInitialized();

        const searchQuery: any = {};
        
        if (params.query) {
          searchQuery.query = params.query;
        }
        
        if (params.tags) {
          searchQuery.tags = params.tags;
        }
        
        if (params.whiteboardId) {
          searchQuery.whiteboardId = params.whiteboardId;
        }
        
        if (params.contentType) {
          searchQuery.contentType = params.contentType;
        }
        
        if (params.dateRange) {
          searchQuery.dateRange = {
            start: new Date(params.dateRange.start),
            end: new Date(params.dateRange.end)
          };
        }

        const results = await this.dataService!.searchCards(searchQuery);
        
        // Due to MCP response size limits, only show basic info in search results
        // Use getCard for full content
        const text = `Found ${results.length} cards:\n` +
          results.map(card => {
            return `- ${card.title || 'Untitled'} (ID: ${card.id})`;
          }).join('\n') +
          '\n\nUse getCard with specific card ID to get full content.';

        return {
          content: [{
            type: 'text',
            text
          }]
        };
      }
    };

    this.server.tool('searchCards', searchCardsSchema.shape, async (params) => {
      return this.tools.searchCards.handler(params);
    });
  }

  private registerDataTools(): void {
    // getWhiteboard
    const getWhiteboardSchema = z.object({
      whiteboardId: z.string(),
      includeCards: z.boolean().optional(),
      includeConnections: z.boolean().optional(),
      depth: z.number().optional()
    });

    this.tools.getWhiteboard = {
      inputSchema: getWhiteboardSchema,
      handler: async (params) => {
        await this.ensureDataServiceInitialized();

        const options = {
          includeCards: params.includeCards || false,
          includeConnections: params.includeConnections || false,
          depth: params.depth
        };

        const result = await this.dataService!.getWhiteboard(params.whiteboardId, options);
        
        let text = `Whiteboard: ${result.whiteboard.name} (ID: ${result.whiteboard.id})\n`;
        text += `Created: ${result.whiteboard.createdTime}\n`;
        text += `Last edited: ${result.whiteboard.lastEditedTime}\n`;
        
        if (result.cards) {
          text += `\nCards: ${result.cards.length}\n`;
          result.cards.forEach(card => {
            text += `- ${card.title || 'Untitled'} (ID: ${card.id})\n`;
          });
        }
        
        if (result.connections) {
          text += `\nConnections: ${result.connections.length}\n`;
        }

        return {
          content: [{
            type: 'text',
            text
          }]
        };
      }
    };

    this.server.tool('getWhiteboard', getWhiteboardSchema.shape, async (params) => {
      return this.tools.getWhiteboard.handler(params);
    });

    // getCard
    const getCardSchema = z.object({
      cardId: z.string(),
      format: z.enum(['json', 'markdown', 'html']).optional(),
      includeRelated: z.boolean().optional()
    });

    this.tools.getCard = {
      inputSchema: getCardSchema,
      handler: async (params) => {
        await this.ensureDataServiceInitialized();

        const result = await this.dataService!.getCard(params.cardId);
        const format = params.format || 'json';
        
        let text = '';
        
        if (format === 'markdown') {
          text = `# ${result.card.title || 'Untitled'}\n\n`;
          text += parseHeptabaseContentToMarkdown(result.card.content);
          
          if (params.includeRelated) {
            const instances = result.instances;
            if (instances.length > 0) {
              text += '\n## Appears on whiteboards:\n';
              for (const instance of instances) {
                const wb = await this.dataService!.getWhiteboard(instance.whiteboardId);
                text += `- ${wb.whiteboard.name}\n`;
              }
            }
            
            const connections = await this.dataService!.getConnections(params.cardId);
            if (connections.length > 0) {
              text += `\n## Related connections: ${connections.length}\n`;
            }
          }
          
          // Return as resource to bypass text size limits
          return {
            content: [{
              type: 'resource',
              resource: {
                uri: `heptabase://card/${result.card.id}`,
                mimeType: 'text/markdown',
                text
              }
            }]
          };
        } else if (format === 'html') {
          text = `<h1>${result.card.title || 'Untitled'}</h1>\n`;
          text += parseHeptabaseContentToHtml(result.card.content);
          
          if (params.includeRelated) {
            const instances = result.instances;
            if (instances.length > 0) {
              text += '<h2>Appears on whiteboards:</h2><ul>';
              for (const instance of instances) {
                const wb = await this.dataService!.getWhiteboard(instance.whiteboardId);
                text += `<li>${wb.whiteboard.name}</li>`;
              }
              text += '</ul>';
            }
          }
          
          // Return as resource to bypass text size limits
          return {
            content: [{
              type: 'resource',
              resource: {
                uri: `heptabase://card/${result.card.id}`,
                mimeType: 'text/html',
                text
              }
            }]
          };
        } else {
          // Default JSON format - return full card data as resource
          const cardData: any = {
            id: result.card.id,
            title: result.card.title,
            content: JSON.parse(result.card.content),
            createdTime: result.card.createdTime,
            lastEditedTime: result.card.lastEditedTime,
            instances: result.instances,
            isTrashed: result.card.isTrashed
          };
          
          if (params.includeRelated) {
            const connections = await this.dataService!.getConnections(params.cardId);
            cardData.connections = connections;
          }
          
          return {
            content: [{
              type: 'resource',
              resource: {
                uri: `heptabase://card/${result.card.id}`,
                mimeType: 'application/json',
                text: JSON.stringify(cardData, null, 2)
              }
            }]
          };
        }
      }
    };

    this.server.tool('getCard', getCardSchema.shape, async (params) => {
      return this.tools.getCard.handler(params);
    });

    // getCardContent - returns full card content as resource to bypass text limits
    const getCardContentSchema = z.object({
      cardId: z.string(),
      format: z.enum(['raw', 'markdown', 'json']).default('markdown')
    });

    this.tools.getCardContent = {
      inputSchema: getCardContentSchema,
      handler: async (params) => {
        await this.ensureDataServiceInitialized();
        
        const handler = await import('./tools/getCardContent');
        return handler.getCardContentHandler(params, this.dataService!);
      }
    };

    this.server.tool('getCardContent', getCardContentSchema.shape, async (params) => {
      return this.tools.getCardContent.handler(params);
    });

    // getCardsByArea
    const getCardsByAreaSchema = z.object({
      whiteboardId: z.string(),
      x: z.number(),
      y: z.number(),
      radius: z.number().optional()
    });

    this.tools.getCardsByArea = {
      inputSchema: getCardsByAreaSchema,
      handler: async (params) => {
        await this.ensureDataServiceInitialized();

        const radius = params.radius || 100;
        const cards = await this.dataService!.getCardsByArea(
          params.whiteboardId,
          params.x,
          params.y,
          radius
        );
        
        let text = `Found ${cards.length} cards within radius ${radius} of (${params.x}, ${params.y})\n`;
        
        for (const card of cards) {
          text += `\n- ${card.title || 'Untitled'} (ID: ${card.id})\n`;
          
          // Get instance info to show position
          const result = await this.dataService!.getCard(card.id);
          const instance = result.instances.find(i => i.whiteboardId === params.whiteboardId);
          if (instance) {
            text += `  Position: (${instance.x}, ${instance.y})\n`;
          }
        }

        return {
          content: [{
            type: 'text',
            text
          }]
        };
      }
    };

    this.server.tool('getCardsByArea', getCardsByAreaSchema.shape, async (params) => {
      return this.tools.getCardsByArea.handler(params);
    });
  }

  private registerExportTools(): void {
    // Import export functions
    const { exportWhiteboard, summarizeWhiteboard, exportWhiteboardSchema, summarizeWhiteboardSchema } = require('./tools/export');
    
    // exportWhiteboard tool
    this.tools.exportWhiteboard = {
      inputSchema: exportWhiteboardSchema,
      handler: async (params) => {
        await this.ensureDataServiceInitialized();
        return exportWhiteboard(this.dataService, params);
      }
    };
    
    this.server.tool('exportWhiteboard', exportWhiteboardSchema.shape, async (params: z.infer<typeof exportWhiteboardSchema>) => {
      return this.tools.exportWhiteboard.handler(params);
    });
    
    // summarizeWhiteboard tool
    this.tools.summarizeWhiteboard = {
      inputSchema: summarizeWhiteboardSchema,
      handler: async (params) => {
        await this.ensureDataServiceInitialized();
        return summarizeWhiteboard(this.dataService, params);
      }
    };
    
    this.server.tool('summarizeWhiteboard', summarizeWhiteboardSchema.shape, async (params: z.infer<typeof summarizeWhiteboardSchema>) => {
      return this.tools.summarizeWhiteboard.handler(params);
    });
  }

  private registerAnalysisTools(): void {
    // Import analysis functions
    const { analyzeGraph, compareBackups, analyzeGraphSchema, compareBackupsSchema } = require('./tools/analysis');
    
    // analyzeGraph tool
    this.tools.analyzeGraph = {
      inputSchema: analyzeGraphSchema,
      handler: async (params) => {
        await this.ensureDataServiceInitialized();
        return analyzeGraph(this.dataService, params);
      }
    };
    
    this.server.tool('analyzeGraph', analyzeGraphSchema.shape, async (params: z.infer<typeof analyzeGraphSchema>) => {
      return this.tools.analyzeGraph.handler(params);
    });
    
    // compareBackups tool
    this.tools.compareBackups = {
      inputSchema: compareBackupsSchema,
      handler: async (params) => {
        if (!this.dataService || !this.backupManager) {
          throw new Error('Services not initialized. Please configure backup path first.');
        }
        return compareBackups(this.dataService, this.backupManager, params);
      }
    };
    
    this.server.tool('compareBackups', compareBackupsSchema.shape, async (params: z.infer<typeof compareBackupsSchema>) => {
      return this.tools.compareBackups.handler(params);
    });
  }

  private registerDebugTools(): void {
    // debugInfo tool
    const debugInfoSchema = z.object({});
    
    this.tools.debugInfo = {
      inputSchema: debugInfoSchema,
      handler: async () => {
        try {
          const result: any = {
            config: this.config,
            backupManager: null,
            dataService: null
          };
          
          // Check backup manager
          if (!this.backupManager) {
            result.backupManager = { status: 'Not initialized' };
          } else {
            const backups = await this.backupManager.listBackups();
            result.backupManager = {
              status: 'Initialized',
              backupCount: backups.length,
              latestBackup: backups[0] || null
            };
          }
          
          // Check data service
          if (!this.dataService) {
            result.dataService = { status: 'Not initialized' };
          } else {
            const data = this.dataService.getData();
            result.dataService = {
              status: 'Initialized',
              whiteboardCount: Object.keys(data.whiteboards).length,
              cardCount: Object.keys(data.cards).length,
              cardInstanceCount: Object.keys(data.cardInstances).length,
              connectionCount: Object.keys(data.connections).length,
              sampleWhiteboards: Object.values(data.whiteboards).slice(0, 3).map(wb => ({
                id: wb.id,
                name: wb.name,
                isTrashed: wb.isTrashed
              }))
            };
          }
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error getting debug info: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    };
    
    this.server.tool('debugInfo', debugInfoSchema.shape, async () => {
      return this.tools.debugInfo.handler({});
    });
  }

  public async initialize(): Promise<void> {
    // Start with default config
    let currentConfig = { ...this.getDefaultConfig() };

    // Load configuration from environment variables
    const envConfig = this.loadEnvConfiguration();
    if (envConfig) {
      currentConfig = { ...currentConfig, ...envConfig };
    }

    // Then load from file if exists (file overrides env)
    const loadedConfig = await this.loadConfiguration();
    if (loadedConfig) {
      currentConfig = { ...currentConfig, ...loadedConfig };
    }

    // Update the server config
    this.config = currentConfig;

    // Initialize services
    if (this.config.backupPath) {
      this.backupManager = new BackupManager({
        backupPath: this.config.backupPath,
        extractionPath: this.config.extractionPath,
        autoExtract: this.config.autoExtract,
        watchDirectory: this.config.watchDirectory,
        keepExtracted: this.config.keepExtracted,
        maxBackups: this.config.maxBackups
      });

      if (this.config.watchDirectory) {
        this.backupManager.startWatching();
      }
    }
  }

  private loadEnvConfiguration(): Partial<HeptabaseConfig> | null {
    const config: Partial<HeptabaseConfig> = {};
    
    if (process.env.HEPTABASE_BACKUP_PATH) {
      config.backupPath = process.env.HEPTABASE_BACKUP_PATH;
    }
    
    if (process.env.HEPTABASE_AUTO_EXTRACT !== undefined) {
      config.autoExtract = process.env.HEPTABASE_AUTO_EXTRACT === 'true';
    }
    
    if (process.env.HEPTABASE_WATCH_DIRECTORY !== undefined) {
      config.watchDirectory = process.env.HEPTABASE_WATCH_DIRECTORY === 'true';
    }
    
    if (process.env.HEPTABASE_EXTRACTION_PATH) {
      config.extractionPath = process.env.HEPTABASE_EXTRACTION_PATH;
    }
    
    if (process.env.HEPTABASE_KEEP_EXTRACTED !== undefined) {
      config.keepExtracted = process.env.HEPTABASE_KEEP_EXTRACTED === 'true';
    }
    
    if (process.env.HEPTABASE_MAX_BACKUPS) {
      const maxBackups = parseInt(process.env.HEPTABASE_MAX_BACKUPS, 10);
      if (!isNaN(maxBackups)) {
        config.maxBackups = maxBackups;
      }
    }
    
    if (process.env.HEPTABASE_CACHE_ENABLED !== undefined) {
      config.cacheEnabled = process.env.HEPTABASE_CACHE_ENABLED === 'true';
    }
    
    if (process.env.HEPTABASE_CACHE_TTL) {
      const cacheTTL = parseInt(process.env.HEPTABASE_CACHE_TTL, 10);
      if (!isNaN(cacheTTL)) {
        config.cacheTTL = cacheTTL;
      }
    }
    
    if (process.env.HEPTABASE_AUTO_SELECT_LATEST !== undefined) {
      config.autoSelectLatest = process.env.HEPTABASE_AUTO_SELECT_LATEST === 'true';
    }
    
    if (process.env.HEPTABASE_DATE_FORMAT) {
      config.dateFormat = process.env.HEPTABASE_DATE_FORMAT;
    }
    
    if (process.env.HEPTABASE_TIMEZONE) {
      config.timezone = process.env.HEPTABASE_TIMEZONE;
    }
    
    return Object.keys(config).length > 0 ? config : null;
  }

  private async loadConfiguration(): Promise<Partial<HeptabaseConfig> | null> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(configData);
    } catch (error) {
      return null;
    }
  }

  private async saveConfiguration(): Promise<void> {
    await fs.writeFile(
      this.configPath,
      JSON.stringify(this.config, null, 2),
      'utf-8'
    );
  }

  public getDefaultConfig(): HeptabaseConfig {
    return {
      backupPath: '',
      autoExtract: true,
      watchDirectory: false,
      extractionPath: path.join(process.cwd(), 'data', 'extracted'),
      keepExtracted: true,
      maxBackups: 10,
      cacheEnabled: true,
      cacheTTL: 3600,
      autoSelectLatest: true,
      dateFormat: 'YYYY-MM-DD',
      timezone: 'UTC'
    };
  }

  public getRegisteredTools(): string[] {
    return Object.keys(this.tools);
  }

  public async start(): Promise<void> {
    await this.initialize();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}