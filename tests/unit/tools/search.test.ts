import { HeptabaseMcpServer } from '@/server';
import { HeptabaseDataService } from '@/services/HeptabaseDataService';
import { Whiteboard, Card } from '@/types/heptabase';
import { z } from 'zod';

jest.mock('@/services/HeptabaseDataService');

describe('Search Tools', () => {
  let server: HeptabaseMcpServer;
  let mockDataService: jest.Mocked<HeptabaseDataService>;

  const mockWhiteboard: Whiteboard = {
    id: 'wb1',
    name: 'Test Whiteboard',
    createdBy: 'user1',
    createdTime: '2024-01-01T00:00:00Z',
    lastEditedTime: '2024-01-02T00:00:00Z',
    spaceId: 'space1',
    isTrashed: false
  };

  const mockCard: Card = {
    id: 'card1',
    title: 'Test Card',
    content: '{"text": "Test content"}',
    createdBy: 'user1',
    createdTime: '2024-01-01T00:00:00Z',
    lastEditedTime: '2024-01-02T00:00:00Z',
    spaceId: 'space1',
    isTrashed: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock data service
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

    // Initialize server with mocked service
    server = new HeptabaseMcpServer();
    server['dataService'] = mockDataService;
  });

  describe('searchWhiteboards tool', () => {
    it('should search whiteboards by query', async () => {
      const mockResults = [mockWhiteboard];
      mockDataService.searchWhiteboards.mockResolvedValue(mockResults);

      const params = {
        query: 'Test'
      };

      const result = await server.tools.searchWhiteboards.handler(params);

      expect(mockDataService.searchWhiteboards).toHaveBeenCalledWith({
        query: 'Test'
      });
      expect(result.content[0].text).toContain('Found 1 whiteboards');
      expect(result.content[0].text).toContain('Test Whiteboard');
    });

    it('should search with date range', async () => {
      mockDataService.searchWhiteboards.mockResolvedValue([]);

      const params = {
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31'
        }
      };

      await server.tools.searchWhiteboards.handler(params);

      expect(mockDataService.searchWhiteboards).toHaveBeenCalledWith({
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      });
    });

    it('should filter by space', async () => {
      mockDataService.searchWhiteboards.mockResolvedValue([mockWhiteboard]);

      const params = {
        spaceId: 'space1'
      };

      await server.tools.searchWhiteboards.handler(params);

      expect(mockDataService.searchWhiteboards).toHaveBeenCalledWith({
        spaceId: 'space1'
      });
    });

    it('should combine search parameters', async () => {
      mockDataService.searchWhiteboards.mockResolvedValue([]);

      const params = {
        query: 'Test',
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31'
        },
        hasCards: true,
        spaceId: 'space1'
      };

      await server.tools.searchWhiteboards.handler(params);

      expect(mockDataService.searchWhiteboards).toHaveBeenCalledWith({
        query: 'Test',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        hasCards: true,
        spaceId: 'space1'
      });
    });

    it('should handle empty results', async () => {
      mockDataService.searchWhiteboards.mockResolvedValue([]);

      const result = await server.tools.searchWhiteboards.handler({});

      expect(result.content[0].text).toContain('Found 0 whiteboards');
    });
  });

  describe('searchCards tool', () => {
    it('should search cards by query', async () => {
      const mockResults = [mockCard];
      mockDataService.searchCards.mockResolvedValue(mockResults);

      const params = {
        query: 'Test content'
      };

      const result = await server.tools.searchCards.handler(params);

      expect(mockDataService.searchCards).toHaveBeenCalledWith({
        query: 'Test content'
      });
      expect(result.content[0].text).toContain('Found 1 cards');
      expect(result.content[0].text).toContain('Test Card');
      expect(result.content[0].text).toContain('Test content');
    });

    it('should search by tags', async () => {
      mockDataService.searchCards.mockResolvedValue([]);

      const params = {
        tags: ['important', 'todo']
      };

      await server.tools.searchCards.handler(params);

      expect(mockDataService.searchCards).toHaveBeenCalledWith({
        tags: ['important', 'todo']
      });
    });

    it('should filter by whiteboard', async () => {
      mockDataService.searchCards.mockResolvedValue([mockCard]);

      const params = {
        whiteboardId: 'wb1'
      };

      await server.tools.searchCards.handler(params);

      expect(mockDataService.searchCards).toHaveBeenCalledWith({
        whiteboardId: 'wb1'
      });
    });

    it('should filter by content type', async () => {
      mockDataService.searchCards.mockResolvedValue([]);

      const params = {
        contentType: 'text'
      };

      await server.tools.searchCards.handler(params);

      expect(mockDataService.searchCards).toHaveBeenCalledWith({
        contentType: 'text'
      });
    });

    it('should handle date range', async () => {
      mockDataService.searchCards.mockResolvedValue([]);

      const params = {
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31'
        }
      };

      await server.tools.searchCards.handler(params);

      expect(mockDataService.searchCards).toHaveBeenCalledWith({
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      });
    });

    it('should combine multiple search criteria', async () => {
      mockDataService.searchCards.mockResolvedValue([]);

      const params = {
        query: 'test',
        tags: ['important'],
        whiteboardId: 'wb1',
        contentType: 'text',
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31'
        }
      };

      await server.tools.searchCards.handler(params);

      expect(mockDataService.searchCards).toHaveBeenCalledWith({
        query: 'test',
        tags: ['important'],
        whiteboardId: 'wb1',
        contentType: 'text',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      });
    });

    it('should show card with truncated content', async () => {
      const longCard = {
        ...mockCard,
        content: '{"text": "' + 'x'.repeat(200) + '"}'
      };
      mockDataService.searchCards.mockResolvedValue([longCard]);

      const result = await server.tools.searchCards.handler({});

      expect(result.content[0].text).toContain('x'.repeat(100) + '...');
    });
  });

  describe('tool schemas', () => {
    it('should have valid searchWhiteboards schema', () => {
      const schema = server.tools.searchWhiteboards.inputSchema;
      expect(schema).toBeInstanceOf(z.ZodObject);
      
      const validInput = {
        query: 'test',
        dateRange: { start: '2024-01-01', end: '2024-01-31' },
        hasCards: true,
        spaceId: 'space1'
      };
      expect(() => schema.parse(validInput)).not.toThrow();
    });

    it('should have valid searchCards schema', () => {
      const schema = server.tools.searchCards.inputSchema;
      expect(schema).toBeInstanceOf(z.ZodObject);
      
      const validInput = {
        query: 'test',
        tags: ['tag1', 'tag2'],
        whiteboardId: 'wb1',
        contentType: 'text',
        dateRange: { start: '2024-01-01', end: '2024-01-31' }
      };
      expect(() => schema.parse(validInput)).not.toThrow();
    });

    it('should validate contentType enum', () => {
      const schema = server.tools.searchCards.inputSchema;
      
      expect(() => schema.parse({ contentType: 'text' })).not.toThrow();
      expect(() => schema.parse({ contentType: 'image' })).not.toThrow();
      expect(() => schema.parse({ contentType: 'link' })).not.toThrow();
      expect(() => schema.parse({ contentType: 'invalid' })).toThrow();
    });
  });
});