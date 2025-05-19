export interface Whiteboard {
  id: string;
  name: string;
  createdBy: string;
  createdTime: string;
  lastEditedTime: string;
  spaceId: string;
  isTrashed: boolean;
}

export interface Card {
  id: string;
  title?: string;
  content: string; // JSON string with rich text
  createdBy: string;
  createdTime: string;
  lastEditedTime: string;
  spaceId: string;
  isTrashed: boolean;
  insights?: any[];
  propertiesConfig?: any;
}

export interface CardInstance {
  id: string;
  cardId: string;
  whiteboardId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  createdBy: string;
  createdTime: string;
  lastEditedTime: string;
  spaceId: string;
}

export interface Connection {
  id: string;
  whiteboardId: string;
  beginId: string;
  beginObjectType: string;
  endId: string;
  endObjectType: string;
  color: string;
  lineStyle: string;
  type: string;
  createdBy: string;
  createdTime: string;
}

export interface BackupMetadata {
  backupId: string;
  backupPath: string;
  createdDate: Date;
  fileSize: number;
  isCompressed: boolean;
  extractedPath?: string;
  version?: string;
}

export interface SearchQuery {
  query?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  whiteboardId?: string;
  contentType?: 'text' | 'image' | 'link';
  limit?: number;
  offset?: number;
}

export interface ExportOptions {
  format: 'markdown' | 'json' | 'mermaid' | 'graphviz';
  includeImages?: boolean;
  includeConnections?: boolean;
  includeMetadata?: boolean;
  outputPath?: string;
}

export interface HeptabaseBackupData {
  whiteboards: Record<string, Whiteboard>;
  cards: Record<string, Card>;
  cardInstances: Record<string, CardInstance>;
  connections: Record<string, Connection>;
  metadata?: BackupMetadata;
}