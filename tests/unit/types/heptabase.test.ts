import { 
  Whiteboard, 
  Card, 
  CardInstance, 
  Connection, 
  BackupMetadata,
  SearchQuery,
  ExportOptions 
} from '@/types/heptabase';

describe('Heptabase Data Models', () => {
  describe('Whiteboard', () => {
    it('should create a valid whiteboard object', () => {
      const whiteboard: Whiteboard = {
        id: '553bb6e7-4bda-48bf-8f1c-d18891364077',
        name: 'Test Whiteboard',
        createdBy: 'user123',
        createdTime: '2024-01-01T00:00:00Z',
        lastEditedTime: '2024-01-02T00:00:00Z',
        spaceId: 'space123',
        isTrashed: false
      };

      expect(whiteboard.id).toBeDefined();
      expect(whiteboard.name).toBe('Test Whiteboard');
      expect(whiteboard.isTrashed).toBe(false);
    });
  });

  describe('Card', () => {
    it('should create a valid card object', () => {
      const card: Card = {
        id: 'card123',
        title: 'Test Card',
        content: '{"text": "Test content"}',
        createdBy: 'user123',
        createdTime: '2024-01-01T00:00:00Z',
        lastEditedTime: '2024-01-02T00:00:00Z',
        spaceId: 'space123',
        isTrashed: false,
        insights: [],
        propertiesConfig: {}
      };

      expect(card.id).toBe('card123');
      expect(card.title).toBe('Test Card');
      expect(card.content).toContain('Test content');
    });

    it('should allow optional title', () => {
      const card: Card = {
        id: 'card123',
        content: '{"text": "Test content"}',
        createdBy: 'user123',
        createdTime: '2024-01-01T00:00:00Z',
        lastEditedTime: '2024-01-02T00:00:00Z',
        spaceId: 'space123',
        isTrashed: false
      };

      expect(card.title).toBeUndefined();
    });
  });

  describe('CardInstance', () => {
    it('should create a valid card instance', () => {
      const cardInstance: CardInstance = {
        id: 'instance123',
        cardId: 'card123',
        whiteboardId: 'whiteboard123',
        x: 100,
        y: 200,
        width: 300,
        height: 150,
        color: '#FFFFFF',
        createdBy: 'user123',
        createdTime: '2024-01-01T00:00:00Z',
        lastEditedTime: '2024-01-02T00:00:00Z',
        spaceId: 'space123'
      };

      expect(cardInstance.x).toBe(100);
      expect(cardInstance.y).toBe(200);
      expect(cardInstance.width).toBe(300);
      expect(cardInstance.height).toBe(150);
    });
  });

  describe('Connection', () => {
    it('should create a valid connection object', () => {
      const connection: Connection = {
        id: 'conn123',
        whiteboardId: 'whiteboard123',
        beginId: 'card123',
        beginObjectType: 'card',
        endId: 'card456',
        endObjectType: 'card',
        color: '#000000',
        lineStyle: 'solid',
        type: 'arrow',
        createdBy: 'user123',
        createdTime: '2024-01-01T00:00:00Z'
      };

      expect(connection.beginId).toBe('card123');
      expect(connection.endId).toBe('card456');
      expect(connection.type).toBe('arrow');
    });
  });

  describe('BackupMetadata', () => {
    it('should create valid backup metadata', () => {
      const metadata: BackupMetadata = {
        backupId: 'backup123',
        backupPath: '/path/to/backup',
        createdDate: new Date('2024-01-01T00:00:00Z'),
        fileSize: 1024000,
        isCompressed: true,
        extractedPath: '/path/to/extracted',
        version: '1.0.0'
      };

      expect(metadata.backupId).toBe('backup123');
      expect(metadata.isCompressed).toBe(true);
      expect(metadata.fileSize).toBe(1024000);
    });
  });

  describe('SearchQuery', () => {
    it('should create a valid search query', () => {
      const query: SearchQuery = {
        query: 'test search',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        },
        tags: ['important', 'todo'],
        whiteboardId: 'whiteboard123',
        contentType: 'text',
        limit: 10,
        offset: 0
      };

      expect(query.query).toBe('test search');
      expect(query.tags).toHaveLength(2);
      expect(query.limit).toBe(10);
    });

    it('should allow partial search query', () => {
      const query: SearchQuery = {
        query: 'test search'
      };

      expect(query.query).toBe('test search');
      expect(query.dateRange).toBeUndefined();
      expect(query.tags).toBeUndefined();
    });
  });

  describe('ExportOptions', () => {
    it('should create valid export options', () => {
      const options: ExportOptions = {
        format: 'markdown',
        includeImages: true,
        includeConnections: true,
        includeMetadata: false,
        outputPath: '/path/to/output'
      };

      expect(options.format).toBe('markdown');
      expect(options.includeImages).toBe(true);
      expect(options.includeConnections).toBe(true);
    });
  });
});