import { HeptabaseMcpServer } from '@/server';
import { HeptabaseDataService } from '@/services/HeptabaseDataService';
import { Whiteboard, Card, CardInstance, Connection } from '@/types/heptabase';
import { z } from 'zod';

jest.mock('@/services/HeptabaseDataService');

describe('Data Retrieval Tools', () => {
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

  const mockCardInstance: CardInstance = {
    id: 'instance1',
    cardId: 'card1',
    whiteboardId: 'wb1',
    x: 100,
    y: 200,
    width: 300,
    height: 150,
    color: '#FFFFFF',
    createdBy: 'user1',
    createdTime: '2024-01-01T00:00:00Z',
    lastEditedTime: '2024-01-02T00:00:00Z',
    spaceId: 'space1'
  };

  const mockConnection: Connection = {
    id: 'conn1',
    whiteboardId: 'wb1',
    beginId: 'instance1',
    beginObjectType: 'card',
    endId: 'instance2',
    endObjectType: 'card',
    color: '#000000',
    lineStyle: 'solid',
    type: 'arrow',
    createdBy: 'user1',
    createdTime: '2024-01-01T00:00:00Z'
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

  describe('getWhiteboard tool', () => {
    it('should get whiteboard without cards', async () => {
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard
      });

      const params = {
        whiteboardId: 'wb1'
      };

      const result = await server.tools.getWhiteboard.handler(params);

      expect(mockDataService.getWhiteboard).toHaveBeenCalledWith('wb1', {
        includeCards: false,
        includeConnections: false
      });
      expect(result.content[0].text).toContain('Test Whiteboard');
      expect(result.content[0].text).toContain('wb1');
    });

    it('should get whiteboard with cards', async () => {
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard,
        cards: [mockCard]
      });

      const params = {
        whiteboardId: 'wb1',
        includeCards: true
      };

      const result = await server.tools.getWhiteboard.handler(params);

      expect(mockDataService.getWhiteboard).toHaveBeenCalledWith('wb1', {
        includeCards: true,
        includeConnections: false
      });
      expect(result.content[0].text).toContain('Cards: 1');
      expect(result.content[0].text).toContain('Test Card');
    });

    it('should get whiteboard with connections', async () => {
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard,
        connections: [mockConnection]
      });

      const params = {
        whiteboardId: 'wb1',
        includeConnections: true
      };

      const result = await server.tools.getWhiteboard.handler(params);

      expect(mockDataService.getWhiteboard).toHaveBeenCalledWith('wb1', {
        includeCards: false,
        includeConnections: true
      });
      expect(result.content[0].text).toContain('Connections: 1');
    });

    it('should get whiteboard with depth parameter', async () => {
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard,
        cards: [mockCard],
        connections: [mockConnection]
      });

      const params = {
        whiteboardId: 'wb1',
        includeCards: true,
        includeConnections: true,
        depth: 2
      };

      const result = await server.tools.getWhiteboard.handler(params);

      expect(mockDataService.getWhiteboard).toHaveBeenCalledWith('wb1', {
        includeCards: true,
        includeConnections: true,
        depth: 2
      });
    });

    it('should handle error when data service not initialized', async () => {
      server['dataService'] = undefined;
      server['backupManager'] = undefined;

      await expect(server.tools.getWhiteboard.handler({ whiteboardId: 'wb1' }))
        .rejects.toThrow('Backup manager not initialized');
    });
  });

  describe('getCard tool', () => {
    it('should get card with default JSON format', async () => {
      mockDataService.getCard.mockResolvedValue({
        card: mockCard,
        instances: [mockCardInstance]
      });
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard
      });

      const params = {
        cardId: 'card1'
      };

      const result = await server.tools.getCard.handler(params);

      expect(mockDataService.getCard).toHaveBeenCalledWith('card1');
      expect(result.content[0].text).toContain('Test Card');
      expect(result.content[0].text).toContain('Instances: 1');
      expect(result.content[0].text).toContain('Test Whiteboard');
    });

    it('should get card in markdown format', async () => {
      mockDataService.getCard.mockResolvedValue({
        card: mockCard,
        instances: [mockCardInstance]
      });

      const params = {
        cardId: 'card1',
        format: 'markdown'
      };

      const result = await server.tools.getCard.handler(params);

      expect(result.content[0].text).toContain('# Test Card');
      expect(result.content[0].text).toContain('Test content');
    });

    it('should get card in HTML format', async () => {
      mockDataService.getCard.mockResolvedValue({
        card: mockCard,
        instances: []
      });

      const params = {
        cardId: 'card1',
        format: 'html'
      };

      const result = await server.tools.getCard.handler(params);

      expect(result.content[0].text).toContain('<h1>Test Card</h1>');
      expect(result.content[0].text).toContain('<p>Test content</p>');
    });

    it('should include related cards when requested', async () => {
      mockDataService.getCard.mockResolvedValue({
        card: mockCard,
        instances: [mockCardInstance]
      });
      mockDataService.getWhiteboard.mockResolvedValue({
        whiteboard: mockWhiteboard
      });
      mockDataService.getConnections.mockResolvedValue([mockConnection]);

      const params = {
        cardId: 'card1',
        includeRelated: true
      };

      const result = await server.tools.getCard.handler(params);

      expect(mockDataService.getConnections).toHaveBeenCalledWith('card1');
      expect(result.content[0].text).toContain('Related connections: 1');
    });
  });

  describe('getCardsByArea tool', () => {
    it('should get cards within area', async () => {
      mockDataService.getCardsByArea.mockResolvedValue([mockCard]);
      mockDataService.getCard.mockResolvedValue({
        card: mockCard,
        instances: [mockCardInstance]
      });

      const params = {
        whiteboardId: 'wb1',
        x: 100,
        y: 200,
        radius: 50
      };

      const result = await server.tools.getCardsByArea.handler(params);

      expect(mockDataService.getCardsByArea).toHaveBeenCalledWith('wb1', 100, 200, 50);
      expect(result.content[0].text).toContain('Found 1 cards within radius 50');
      expect(result.content[0].text).toContain('Test Card');
    });

    it('should use default radius when not specified', async () => {
      mockDataService.getCardsByArea.mockResolvedValue([]);

      const params = {
        whiteboardId: 'wb1',
        x: 100,
        y: 200
      };

      const result = await server.tools.getCardsByArea.handler(params);

      expect(mockDataService.getCardsByArea).toHaveBeenCalledWith('wb1', 100, 200, 100);
      expect(result.content[0].text).toContain('Found 0 cards within radius 100');
    });

    it('should show card positions', async () => {
      // Mock the data service to return card instances
      mockDataService.getCardsByArea.mockResolvedValue([mockCard]);
      mockDataService.getCard.mockResolvedValue({
        card: mockCard,
        instances: [mockCardInstance]
      });

      const params = {
        whiteboardId: 'wb1',
        x: 100,
        y: 200,
        radius: 50
      };

      const result = await server.tools.getCardsByArea.handler(params);

      expect(result.content[0].text).toContain('Position: (100, 200)');
    });
  });

  describe('tool schemas', () => {
    it('should have valid getWhiteboard schema', () => {
      const schema = server.tools.getWhiteboard.inputSchema;
      expect(schema).toBeInstanceOf(z.ZodObject);
      
      const validInput = {
        whiteboardId: 'wb1',
        includeCards: true,
        includeConnections: true,
        depth: 2
      };
      expect(() => schema.parse(validInput)).not.toThrow();
    });

    it('should have valid getCard schema', () => {
      const schema = server.tools.getCard.inputSchema;
      expect(schema).toBeInstanceOf(z.ZodObject);
      
      const validInput = {
        cardId: 'card1',
        format: 'markdown',
        includeRelated: true
      };
      expect(() => schema.parse(validInput)).not.toThrow();
    });

    it('should have valid getCardsByArea schema', () => {
      const schema = server.tools.getCardsByArea.inputSchema;
      expect(schema).toBeInstanceOf(z.ZodObject);
      
      const validInput = {
        whiteboardId: 'wb1',
        x: 100,
        y: 200,
        radius: 50
      };
      expect(() => schema.parse(validInput)).not.toThrow();
    });

    it('should validate format enum in getCard', () => {
      const schema = server.tools.getCard.inputSchema;
      
      expect(() => schema.parse({ cardId: 'card1', format: 'json' })).not.toThrow();
      expect(() => schema.parse({ cardId: 'card1', format: 'markdown' })).not.toThrow();
      expect(() => schema.parse({ cardId: 'card1', format: 'html' })).not.toThrow();
      expect(() => schema.parse({ cardId: 'card1', format: 'invalid' })).toThrow();
    });
  });
});