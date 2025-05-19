import { HeptabaseMcpServer } from '@/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

jest.mock('@modelcontextprotocol/sdk/server/stdio.js');

describe('HeptabaseMcpServer', () => {
  let server: HeptabaseMcpServer;

  beforeEach(() => {
    server = new HeptabaseMcpServer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create an MCP server instance', () => {
      expect(server.server).toBeInstanceOf(McpServer);
    });

    it('should have server name and version configured', () => {
      expect(server.serverName).toBe('Heptabase MCP');
      expect(server.serverVersion).toBe('1.0.0');
    });

    it('should have all required tools registered', () => {
      const tools = server.getRegisteredTools();
      
      // Backup management tools
      expect(tools).toContain('configureBackupPath');
      expect(tools).toContain('listBackups');
      expect(tools).toContain('loadBackup');
      
      // Search tools
      expect(tools).toContain('searchWhiteboards');
      expect(tools).toContain('searchCards');
      
      // Data retrieval tools
      expect(tools).toContain('getWhiteboard');
      expect(tools).toContain('getCard');
      expect(tools).toContain('getCardsByArea');
      
      // Export tools
      expect(tools).toContain('exportWhiteboard');
      expect(tools).toContain('summarizeWhiteboard');
      
      // Analysis tools
      expect(tools).toContain('analyzeGraph');
      expect(tools).toContain('compareBackups');
    });
  });

  describe('start', () => {
    it('should connect to stdio transport', async () => {
      const mockTransport = new StdioServerTransport();
      const connectSpy = jest.spyOn(server.server, 'connect');
      
      await server.start();
      
      expect(connectSpy).toHaveBeenCalledWith(expect.any(StdioServerTransport));
    });
  });

  describe('configuration', () => {
    it('should load configuration from file if exists', async () => {
      const mockConfig = {
        backupPath: '/test/backup/path',
        autoExtract: true,
        watchDirectory: true,
        extractionPath: './data/extracted',
        keepExtracted: true,
        maxBackups: 10,
        cacheEnabled: true,
        cacheTTL: 3600,
        autoSelectLatest: true,
        dateFormat: 'YYYY-MM-DD',
        timezone: 'UTC'
      };
      
      jest.spyOn(server as any, 'loadConfiguration').mockResolvedValue(mockConfig);
      
      await server.initialize();
      
      expect(server.config).toEqual(mockConfig);
    });

    it('should use default configuration if file does not exist', async () => {
      jest.spyOn(server as any, 'loadConfiguration').mockResolvedValue(null);
      
      await server.initialize();
      
      expect(server.config).toEqual(server.getDefaultConfig());
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration values', () => {
      const defaultConfig = server.getDefaultConfig();
      
      expect(defaultConfig).toEqual({
        backupPath: '',
        autoExtract: true,
        watchDirectory: false,
        extractionPath: expect.stringContaining('data/extracted'),
        keepExtracted: true,
        maxBackups: 10,
        cacheEnabled: true,
        cacheTTL: 3600,
        autoSelectLatest: true,
        dateFormat: 'YYYY-MM-DD',
        timezone: 'UTC'
      });
    });
  });
});