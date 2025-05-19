import { HeptabaseDataService } from '@/services/HeptabaseDataService';
import { HeptabaseBackupData, Whiteboard, Card, CardInstance, Connection } from '@/types/heptabase';
import fs from 'fs-extra';
import path from 'path';

jest.mock('fs-extra');

describe('HeptabaseDataService', () => {
  let service: HeptabaseDataService;
  const testDataPath = '/test/data/path';

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

  const mockBackupData: HeptabaseBackupData = {
    whiteboards: { wb1: mockWhiteboard },
    cards: { card1: mockCard },
    cardInstances: { instance1: mockCardInstance },
    connections: { conn1: mockConnection }
  };

  beforeEach(() => {
    service = new HeptabaseDataService({
      dataPath: testDataPath,
      cacheEnabled: true,
      cacheTTL: 3600
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadData', () => {
    it('should load data from JSON files', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
      (fs.readJson as unknown as jest.Mock).mockImplementation((filePath) => {
        const fileName = path.basename(filePath);
        switch (fileName) {
          case 'whiteboard.json':
            return Promise.resolve([mockWhiteboard]);
          case 'card.json':
            return Promise.resolve([mockCard]);
          case 'card-Instance.json':
            return Promise.resolve([mockCardInstance]);
          case 'connection.json':
            return Promise.resolve([mockConnection]);
          default:
            return Promise.resolve([]);
        }
      });

      await service.loadData();

      expect(fs.readJson).toHaveBeenCalledWith(path.join(testDataPath, 'whiteboard.json'));
      expect(fs.readJson).toHaveBeenCalledWith(path.join(testDataPath, 'card.json'));
      expect(fs.readJson).toHaveBeenCalledWith(path.join(testDataPath, 'card-Instance.json'));
      expect(fs.readJson).toHaveBeenCalledWith(path.join(testDataPath, 'connection.json'));
    });

    it('should handle missing data files gracefully', async () => {
      (fs.pathExists as unknown as jest.Mock).mockImplementation((filePath) => {
        return Promise.resolve(filePath.includes('whiteboard.json'));
      });
      (fs.readJson as unknown as jest.Mock).mockResolvedValue([mockWhiteboard]);

      await service.loadData();

      expect(service.getData().whiteboards).toHaveProperty('wb1');
      expect(service.getData().cards).toEqual({});
    });

    it('should handle invalid JSON gracefully', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
      (fs.readJson as unknown as jest.Mock).mockRejectedValue(new Error('Invalid JSON'));

      await expect(service.loadData()).rejects.toThrow('Invalid JSON');
    });
  });

  describe('searchWhiteboards', () => {
    beforeEach(async () => {
      // Mock the internal data
      service['data'] = mockBackupData;
    });

    it('should search whiteboards by name', async () => {
      const results = await service.searchWhiteboards({
        query: 'Test'
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockWhiteboard);
    });

    it('should return empty array when no matches found', async () => {
      const results = await service.searchWhiteboards({
        query: 'NonExistent'
      });

      expect(results).toHaveLength(0);
    });

    it('should filter by date range', async () => {
      const results = await service.searchWhiteboards({
        dateRange: {
          start: new Date('2023-12-31'),
          end: new Date('2024-01-15')
        }
      });

      expect(results).toHaveLength(1);
    });

    it('should filter trashed whiteboards', async () => {
      const trashedWhiteboard = { ...mockWhiteboard, id: 'wb2', isTrashed: true };
      service['data'].whiteboards['wb2'] = trashedWhiteboard;

      const results = await service.searchWhiteboards({});

      expect(results).toHaveLength(1);
      expect(results[0].isTrashed).toBe(false);
    });
  });

  describe('searchCards', () => {
    beforeEach(async () => {
      service['data'] = mockBackupData;
    });

    it('should search cards by content', async () => {
      const results = await service.searchCards({
        query: 'Test content'
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockCard);
    });

    it('should search cards by title', async () => {
      const results = await service.searchCards({
        query: 'Test Card'
      });

      expect(results).toHaveLength(1);
    });

    it('should filter by whiteboard', async () => {
      const results = await service.searchCards({
        whiteboardId: 'wb1'
      });

      expect(results).toHaveLength(1);
    });

    it('should return cards with instances on specified whiteboard', async () => {
      const card2 = { ...mockCard, id: 'card2' };
      service['data'].cards['card2'] = card2;

      const results = await service.searchCards({
        whiteboardId: 'wb1'
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('card1');
    });
  });

  describe('getWhiteboard', () => {
    beforeEach(async () => {
      service['data'] = mockBackupData;
    });

    it('should get whiteboard with cards and connections', async () => {
      const result = await service.getWhiteboard('wb1', {
        includeCards: true,
        includeConnections: true
      });

      expect(result.whiteboard).toEqual(mockWhiteboard);
      expect(result.cards).toHaveLength(1);
      expect(result.connections).toHaveLength(1);
    });

    it('should throw error for non-existent whiteboard', async () => {
      await expect(service.getWhiteboard('nonexistent')).rejects.toThrow('Whiteboard not found');
    });

    it('should exclude cards when includeCards is false', async () => {
      const result = await service.getWhiteboard('wb1', {
        includeCards: false,
        includeConnections: false
      });

      expect(result.cards).toBeUndefined();
      expect(result.connections).toBeUndefined();
    });
  });

  describe('getCard', () => {
    beforeEach(async () => {
      service['data'] = mockBackupData;
    });

    it('should get card with instances', async () => {
      const result = await service.getCard('card1');

      expect(result.card).toEqual(mockCard);
      expect(result.instances).toHaveLength(1);
      expect(result.instances[0]).toEqual(mockCardInstance);
    });

    it('should throw error for non-existent card', async () => {
      await expect(service.getCard('nonexistent')).rejects.toThrow('Card not found');
    });
  });

  describe('getCardsByArea', () => {
    beforeEach(async () => {
      service['data'] = mockBackupData;
    });

    it('should get cards within specified area', async () => {
      const results = await service.getCardsByArea('wb1', 50, 150, 100);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockCard);
    });

    it('should return empty array when no cards in area', async () => {
      const results = await service.getCardsByArea('wb1', 500, 500, 50);

      expect(results).toHaveLength(0);
    });

    it('should calculate distance correctly', async () => {
      // Card instance is at (100, 200)
      // Searching at (150, 250) with radius 100 should find it
      // Distance = sqrt((150-100)^2 + (250-200)^2) = sqrt(2500 + 2500) = 70.7
      const results = await service.getCardsByArea('wb1', 150, 250, 100);

      expect(results).toHaveLength(1);
    });
  });

  describe('getConnections', () => {
    beforeEach(async () => {
      service['data'] = mockBackupData;
    });

    it('should get connections for a card', async () => {
      const results = await service.getConnections('card1');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockConnection);
    });

    it('should return empty array for card with no connections', async () => {
      const results = await service.getConnections('card2');

      expect(results).toHaveLength(0);
    });
  });

  describe('caching', () => {
    beforeEach(async () => {
      service['data'] = mockBackupData;
    });

    it('should cache search results when enabled', async () => {
      const query = { query: 'Test' };
      
      // First call
      const results1 = await service.searchWhiteboards(query);
      
      // Second call should use cache
      const results2 = await service.searchWhiteboards(query);
      
      expect(results1).toEqual(results2);
    });

    it('should not cache when disabled', async () => {
      service = new HeptabaseDataService({
        dataPath: testDataPath,
        cacheEnabled: false,
        cacheTTL: 3600
      });
      service['data'] = mockBackupData;

      const query = { query: 'Test' };
      const results = await service.searchWhiteboards(query);

      expect(results).toHaveLength(1);
    });
  });
});