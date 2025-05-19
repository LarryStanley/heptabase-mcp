import { HeptabaseMcpServer } from '@/server';
import { HeptabaseDataService } from '@/services/HeptabaseDataService';
import { promises as fs } from 'fs';

jest.mock('@/services/HeptabaseDataService');
jest.mock('fs', () => ({
  native: {},
  promises: {
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
  content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Test content"}]}]}',
  createdBy: 'user1',
  createdTime: '2024-01-01T00:00:00Z',
  lastEditedTime: '2024-01-02T00:00:00Z',
  isTrashed: false,
  spaceId: 'space1'
};

const mockCardInstance = {
  id: 'instance1',
  cardId: 'card1',
  whiteboardId: 'wb1',
  x: 100,
  y: 200,
  width: 300,
  height: 150,
  zIndex: 1,
  color: 'blue',
  isExpanded: true
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

describe('Export Tools', () => {
  let server: HeptabaseMcpServer;
  let mockDataService: MockedDataService;

  beforeEach(() => {
    server = new HeptabaseMcpServer();
    mockDataService = HeptabaseDataService.prototype as MockedDataService;
    server['dataService'] = mockDataService;
    server.initialize();
  });

  describe('exportWhiteboard tool', () => {
    it('should export whiteboard in markdown format', async () => {
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard,
        cards: [mockCard],
        connections: [mockConnection]
      });

      const params = {
        whiteboardId: 'wb1',
        format: 'markdown',
        includeCards: true,
        includeConnections: true,
        outputPath: '/test/output.md'
      };

      const result = await server.tools.exportWhiteboard.handler(params);

      expect(mockDataService.getWhiteboard).toHaveBeenCalledWith('wb1', {
        includeCards: true,
        includeConnections: true
      });
      expect(result.content[0].text).toContain('Exported whiteboard to /test/output.md');
    });

    it('should export whiteboard in JSON format', async () => {
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard,
        cards: [mockCard]
      });

      const params = {
        whiteboardId: 'wb1',
        format: 'json',
        includeCards: true,
        outputPath: '/test/output.json'
      };

      const result = await server.tools.exportWhiteboard.handler(params);

      expect(result.content[0].text).toContain('Exported whiteboard to /test/output.json');
    });

    it('should export whiteboard in HTML format', async () => {
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard,
        cards: []
      });

      const params = {
        whiteboardId: 'wb1',
        format: 'html',
        outputPath: '/test/output.html'
      };

      const result = await server.tools.exportWhiteboard.handler(params);

      expect(result.content[0].text).toContain('Exported whiteboard to /test/output.html');
    });

    it('should use default format when not specified', async () => {
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard
      });

      const params = {
        whiteboardId: 'wb1',
        outputPath: '/test/output.md'
      };

      const result = await server.tools.exportWhiteboard.handler(params);

      expect(result.content[0].text).toContain('Exported whiteboard to /test/output.md');
    });

    it('should handle includeMetadata option', async () => {
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard
      });

      const params = {
        whiteboardId: 'wb1',
        format: 'markdown',
        includeMetadata: true,
        outputPath: '/test/output.md'
      };

      const result = await server.tools.exportWhiteboard.handler(params);

      expect(result.content[0].text).toContain('Included metadata in export');
    });
  });

  describe('summarizeWhiteboard tool', () => {
    it('should summarize whiteboard content', async () => {
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard,
        cards: [mockCard, mockCard],
        connections: [mockConnection]
      });

      const params = {
        whiteboardId: 'wb1',
        format: 'text'
      };

      const result = await server.tools.summarizeWhiteboard.handler(params);

      expect(mockDataService.getWhiteboard).toHaveBeenCalledWith('wb1', {
        includeCards: true,
        includeConnections: true
      });
      expect(result.content[0].text).toContain('Test Whiteboard');
      expect(result.content[0].text).toContain('2 cards');
      expect(result.content[0].text).toContain('1 connections');
    });

    it('should generate structured summary', async () => {
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard,
        cards: [mockCard]
      });

      const params = {
        whiteboardId: 'wb1',
        format: 'structured'
      };

      const result = await server.tools.summarizeWhiteboard.handler(params);

      expect(result.content[0].text).toContain('Overview');
      expect(result.content[0].text).toContain('Key Topics');
      expect(result.content[0].text).toContain('Statistics');
    });

    it('should use default format when not specified', async () => {
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard
      });

      const params = {
        whiteboardId: 'wb1'
      };

      const result = await server.tools.summarizeWhiteboard.handler(params);

      expect(result.content[0].text).toContain('Test Whiteboard');
    });

    it('should handle includeStatistics option', async () => {
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard,
        cards: [mockCard],
        connections: [mockConnection]
      });

      const params = {
        whiteboardId: 'wb1',
        format: 'text',
        includeStatistics: true
      };

      const result = await server.tools.summarizeWhiteboard.handler(params);

      expect(result.content[0].text).toContain('Word count');
      expect(result.content[0].text).toContain('Character count');
    });
  });

  describe('tool schemas', () => {
    it('should have valid exportWhiteboard schema', () => {
      const schema = server.tools.exportWhiteboard.inputSchema.parse({
        whiteboardId: 'wb1',
        outputPath: '/test/output.md'
      });

      expect(schema.whiteboardId).toBe('wb1');
      expect(schema.outputPath).toBe('/test/output.md');
    });

    it('should have valid summarizeWhiteboard schema', () => {
      const schema = server.tools.summarizeWhiteboard.inputSchema.parse({
        whiteboardId: 'wb1'
      });

      expect(schema.whiteboardId).toBe('wb1');
    });

    it('should validate format enum in exportWhiteboard', () => {
      const validFormats = ['markdown', 'json', 'html'];
      
      validFormats.forEach(format => {
        const schema = server.tools.exportWhiteboard.inputSchema.parse({
          whiteboardId: 'wb1',
          format,
          outputPath: '/test/output'
        });
        expect(schema.format).toBe(format);
      });
    });

    it('should validate format enum in summarizeWhiteboard', () => {
      const validFormats = ['text', 'structured'];
      
      validFormats.forEach(format => {
        const schema = server.tools.summarizeWhiteboard.inputSchema.parse({
          whiteboardId: 'wb1',
          format
        });
        expect(schema.format).toBe(format);
      });
    });
  });
});