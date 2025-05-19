import fs from 'fs-extra';
import path from 'path';
import {
  HeptabaseBackupData,
  Whiteboard,
  Card,
  CardInstance,
  Connection,
  SearchQuery
} from '@/types/heptabase';

export interface HeptabaseDataServiceConfig {
  dataPath: string;
  cacheEnabled: boolean;
  cacheTTL: number;
}

interface WhiteboardResult {
  whiteboard: Whiteboard;
  cards?: Card[];
  connections?: Connection[];
}

interface CardResult {
  card: Card;
  instances: CardInstance[];
}

export class HeptabaseDataService {
  private config: HeptabaseDataServiceConfig;
  private data: HeptabaseBackupData = {
    whiteboards: {},
    cards: {},
    cardInstances: {},
    connections: {}
  };
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(config: HeptabaseDataServiceConfig) {
    this.config = config;
  }

  async loadData(): Promise<void> {
    const { dataPath } = this.config;

    try {
      // Check for All-Data.json (actual Heptabase backup format)
      const allDataPath = path.join(dataPath, 'All-Data.json');
      if (await fs.pathExists(allDataPath)) {
        const allData = await fs.readJson(allDataPath);
        
        // Load whiteboards from whiteBoardList
        if (allData.whiteBoardList) {
          this.data.whiteboards = this.arrayToObject(allData.whiteBoardList);
        }
        
        // Load cards from cardList
        if (allData.cardList) {
          this.data.cards = this.arrayToObject(allData.cardList);
        }
        
        // Load card instances from cardInstances
        if (allData.cardInstances) {
          this.data.cardInstances = this.arrayToObject(allData.cardInstances);
        }
        
        // Load connections from connections
        if (allData.connections) {
          this.data.connections = this.arrayToObject(allData.connections);
        }
      } else {
        // Fall back to test format with separate files
        // Load whiteboards
        const whiteboardPath = path.join(dataPath, 'whiteboard.json');
        if (await fs.pathExists(whiteboardPath)) {
          const whiteboards = await fs.readJson(whiteboardPath);
          this.data.whiteboards = this.arrayToObject(whiteboards);
        }

        // Load cards
        const cardPath = path.join(dataPath, 'card.json');
        if (await fs.pathExists(cardPath)) {
          const cards = await fs.readJson(cardPath);
          this.data.cards = this.arrayToObject(cards);
        }

        // Load card instances
        const instancePath = path.join(dataPath, 'card-Instance.json');
        if (await fs.pathExists(instancePath)) {
          const instances = await fs.readJson(instancePath);
          this.data.cardInstances = this.arrayToObject(instances);
        }

        // Load connections
        const connectionPath = path.join(dataPath, 'connection.json');
        if (await fs.pathExists(connectionPath)) {
          const connections = await fs.readJson(connectionPath);
          this.data.connections = this.arrayToObject(connections);
        }
      }
    } catch (error) {
      throw error;
    }
  }

  private arrayToObject<T extends { id: string }>(array: T[]): Record<string, T> {
    return array.reduce((obj, item) => {
      obj[item.id] = item;
      return obj;
    }, {} as Record<string, T>);
  }

  async searchWhiteboards(query: SearchQuery): Promise<Whiteboard[]> {
    const cacheKey = `whiteboards:${JSON.stringify(query)}`;
    
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    const results = Object.values(this.data.whiteboards).filter(whiteboard => {
      // Filter out trashed whiteboards
      if (whiteboard.isTrashed) return false;

      // Search by query
      if (query.query) {
        const searchTerm = query.query.toLowerCase();
        if (!whiteboard.name.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }

      // Filter by date range
      if (query.dateRange) {
        const createdDate = new Date(whiteboard.createdTime);
        if (createdDate < query.dateRange.start || createdDate > query.dateRange.end) {
          return false;
        }
      }

      return true;
    });

    if (this.config.cacheEnabled) {
      this.setCache(cacheKey, results);
    }

    return results;
  }

  async searchCards(query: SearchQuery): Promise<Card[]> {
    const cacheKey = `cards:${JSON.stringify(query)}`;
    
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    const results = Object.values(this.data.cards).filter(card => {
      // Filter out trashed cards
      if (card.isTrashed) return false;

      // Search by query in title and content
      if (query.query) {
        const searchTerm = query.query.toLowerCase();
        const titleMatch = card.title?.toLowerCase().includes(searchTerm) || false;
        const contentMatch = card.content.toLowerCase().includes(searchTerm);
        if (!titleMatch && !contentMatch) {
          return false;
        }
      }

      // Filter by whiteboard
      if (query.whiteboardId) {
        const hasInstance = Object.values(this.data.cardInstances).some(
          instance => instance.cardId === card.id && instance.whiteboardId === query.whiteboardId
        );
        if (!hasInstance) return false;
      }

      // Filter by date range
      if (query.dateRange) {
        const createdDate = new Date(card.createdTime);
        if (createdDate < query.dateRange.start || createdDate > query.dateRange.end) {
          return false;
        }
      }

      return true;
    });

    if (this.config.cacheEnabled) {
      this.setCache(cacheKey, results);
    }

    return results;
  }

  async getWhiteboard(
    whiteboardId: string,
    options: { includeCards?: boolean; includeConnections?: boolean } = {}
  ): Promise<WhiteboardResult> {
    const whiteboard = this.data.whiteboards[whiteboardId];
    if (!whiteboard) {
      throw new Error('Whiteboard not found');
    }

    const result: WhiteboardResult = { whiteboard };

    if (options.includeCards) {
      const instances = Object.values(this.data.cardInstances).filter(
        instance => instance.whiteboardId === whiteboardId
      );
      const cardIds = instances.map(instance => instance.cardId);
      result.cards = cardIds.map(id => this.data.cards[id]).filter(Boolean);
    }

    if (options.includeConnections) {
      result.connections = Object.values(this.data.connections).filter(
        connection => connection.whiteboardId === whiteboardId
      );
    }

    return result;
  }

  async getCard(cardId: string): Promise<CardResult> {
    const card = this.data.cards[cardId];
    if (!card) {
      throw new Error('Card not found');
    }

    const instances = Object.values(this.data.cardInstances).filter(
      instance => instance.cardId === cardId
    );

    return { card, instances };
  }

  async getCardsByArea(
    whiteboardId: string,
    x: number,
    y: number,
    radius: number
  ): Promise<Card[]> {
    const instances = Object.values(this.data.cardInstances).filter(instance => {
      if (instance.whiteboardId !== whiteboardId) return false;
      
      const distance = Math.sqrt(
        Math.pow(instance.x - x, 2) + Math.pow(instance.y - y, 2)
      );
      
      return distance <= radius;
    });

    const cardIds = instances.map(instance => instance.cardId);
    return cardIds.map(id => this.data.cards[id]).filter(Boolean);
  }

  async getConnections(cardId?: string): Promise<Connection[]> {
    if (cardId) {
      // Find all instances of this card
      const instances = Object.values(this.data.cardInstances).filter(
        instance => instance.cardId === cardId
      );
      const instanceIds = instances.map(instance => instance.id);

      // Find connections where this card's instances are involved
      return Object.values(this.data.connections).filter(connection => {
        return instanceIds.includes(connection.beginId) || instanceIds.includes(connection.endId);
      });
    }
    return Object.values(this.data.connections);
  }

  async getWhiteboards(): Promise<Whiteboard[]> {
    return Object.values(this.data.whiteboards).filter(wb => !wb.isTrashed);
  }

  async getCards(): Promise<Card[]> {
    return Object.values(this.data.cards).filter(card => !card.isTrashed);
  }

  getData(): HeptabaseBackupData {
    return this.data;
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheTTL * 1000) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}