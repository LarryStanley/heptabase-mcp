import { z } from 'zod';
import { HeptabaseDataService } from '../services/HeptabaseDataService';
import { BackupManager } from '../services/BackupManager';
import { promises as fs } from 'fs';
import * as path from 'path';

export const analyzeGraphSchema = z.object({
  whiteboardId: z.string().optional(),
  metrics: z.array(z.enum(['centrality', 'clustering', 'density'])).optional(),
  exportPath: z.string().optional()
});

export const compareBackupsSchema = z.object({
  backupId1: z.string(),
  backupId2: z.string(),
  whiteboardId: z.string().optional(),
  exportPath: z.string().optional()
});

export async function analyzeGraph(
  dataService: HeptabaseDataService,
  params: z.infer<typeof analyzeGraphSchema>
) {
  let analysis: any = {
    timestamp: new Date().toISOString(),
    metrics: {}
  };

  if (params.whiteboardId) {
    // Analyze specific whiteboard
    const data = await dataService.getWhiteboard(params.whiteboardId, {
      includeCards: true,
      includeConnections: true
    });

    analysis.whiteboard = data.whiteboard.name;
    analysis.nodes = data.cards?.length || 0;
    analysis.edges = data.connections?.length || 0;
  } else {
    // Analyze entire knowledge graph
    const whiteboards = await dataService.getWhiteboards();
    const cards = await dataService.getCards();
    const connections = await dataService.getConnections();

    analysis.whiteboards = whiteboards.length;
    analysis.nodes = cards.length;
    analysis.edges = connections.length;
  }

  // Calculate metrics if requested
  if (params.metrics?.includes('centrality')) {
    analysis.metrics.centrality = await calculateCentrality(dataService, params.whiteboardId);
  }

  if (params.metrics?.includes('clustering')) {
    analysis.metrics.clustering = await calculateClustering(dataService, params.whiteboardId);
  }

  if (params.metrics?.includes('density')) {
    analysis.metrics.density = analysis.edges / (analysis.nodes * (analysis.nodes - 1));
  }

  // Format response
  let text = 'Knowledge Graph Analysis\n\n';
  
  if (params.whiteboardId) {
    text += `Whiteboard: ${analysis.whiteboard}\n`;
  } else {
    text += `Total whiteboards: ${analysis.whiteboards}\n`;
  }
  
  text += `Total nodes: ${analysis.nodes}\n`;
  text += `Total edges: ${analysis.edges}\n`;

  if (analysis.metrics.centrality) {
    text += '\nCentrality:\n';
    text += 'Most central nodes:\n';
    const sorted = Object.entries(analysis.metrics.centrality)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 5);
    
    for (const [nodeId, score] of sorted) {
      text += `- ${nodeId}: ${score}\n`;
    }
  }

  if (analysis.metrics.clustering) {
    text += `\nClustering coefficient: ${analysis.metrics.clustering}\n`;
  }

  if (analysis.metrics.density) {
    text += `\nGraph density: ${analysis.metrics.density.toFixed(3)}\n`;
  }

  // Export if requested
  if (params.exportPath) {
    await fs.mkdir(path.dirname(params.exportPath), { recursive: true });
    await fs.writeFile(params.exportPath, JSON.stringify(analysis, null, 2), 'utf8');
    text += `\nAnalysis saved to ${params.exportPath}`;
  }

  return {
    content: [{
      type: 'text',
      text
    }]
  };
}

export async function compareBackups(
  dataService: HeptabaseDataService,
  backupManager: BackupManager,
  params: z.infer<typeof compareBackupsSchema>
) {
  // Get backup metadata
  const backup1 = await backupManager.getBackupMetadata(params.backupId1);
  const backup2 = await backupManager.getBackupMetadata(params.backupId2);

  if (!backup1 || !backup2) {
    throw new Error('One or both backups not found');
  }

  // Load the first backup
  await backupManager.loadBackup(backup1.backupPath);
  
  let data1: any;
  let data2: any;

  if (params.whiteboardId) {
    // Compare specific whiteboard
    data1 = await dataService.getWhiteboard(params.whiteboardId, {
      includeCards: true,
      includeConnections: true
    });

    // Load the second backup
    await backupManager.loadBackup(backup2.backupPath);
    
    data2 = await dataService.getWhiteboard(params.whiteboardId, {
      includeCards: true,
      includeConnections: true
    });
  } else {
    // Compare entire backups
    data1 = {
      whiteboards: await dataService.getWhiteboards(),
      cards: await dataService.getCards(),
      connections: await dataService.getConnections()
    };

    // Load the second backup
    await backupManager.loadBackup(backup2.backupPath);
    
    data2 = {
      whiteboards: await dataService.getWhiteboards(),
      cards: await dataService.getCards(),
      connections: await dataService.getConnections()
    };
  }

  // Calculate differences
  const comparison = {
    timestamp: new Date().toISOString(),
    backup1: {
      id: backup1.backupId,
      date: backup1.createdDate,
      size: backup1.fileSize
    },
    backup2: {
      id: backup2.backupId,
      date: backup2.createdDate,
      size: backup2.fileSize
    },
    changes: {} as any
  };

  if (params.whiteboardId) {
    comparison.changes = {
      whiteboard: params.whiteboardId,
      cardsAdded: data2.cards.length - data1.cards.length,
      connectionsAdded: data2.connections.length - data1.connections.length
    };
  } else {
    comparison.changes = {
      whiteboardsAdded: data2.whiteboards.length - data1.whiteboards.length,
      cardsAdded: data2.cards.length - data1.cards.length,
      connectionsAdded: data2.connections.length - data1.connections.length
    };
  }

  // Format response
  let text = 'Comparison Results\n\n';
  text += `Backup 1: ${backup1.backupId} (${backup1.createdDate})\n`;
  text += `Backup 2: ${backup2.backupId} (${backup2.createdDate})\n\n`;

  if (params.whiteboardId) {
    text += `Whiteboard: ${data1.whiteboard.name}\n`;
    text += `Added: ${comparison.changes.cardsAdded} cards\n`;
    text += `Added: ${comparison.changes.connectionsAdded} connections\n`;
  } else {
    text += `Added: ${comparison.changes.whiteboardsAdded} whiteboards\n`;
    text += `Added: ${comparison.changes.cardsAdded} cards\n`;
    text += `Added: ${comparison.changes.connectionsAdded} connections\n`;
  }

  // Export if requested
  if (params.exportPath) {
    await fs.mkdir(path.dirname(params.exportPath), { recursive: true });
    await fs.writeFile(params.exportPath, JSON.stringify(comparison, null, 2), 'utf8');
    text += `\nComparison saved to ${params.exportPath}`;
  }

  return {
    content: [{
      type: 'text',
      text
    }]
  };
}

async function calculateCentrality(dataService: HeptabaseDataService, whiteboardId?: string): Promise<Record<string, number>> {
  const connections = whiteboardId 
    ? (await dataService.getWhiteboard(whiteboardId, { includeConnections: true })).connections || []
    : await dataService.getConnections();

  const centrality: Record<string, number> = {};

  // Calculate degree centrality
  for (const connection of connections) {
    centrality[connection.beginId] = (centrality[connection.beginId] || 0) + 1;
    centrality[connection.endId] = (centrality[connection.endId] || 0) + 1;
  }

  return centrality;
}

async function calculateClustering(dataService: HeptabaseDataService, whiteboardId?: string): Promise<number> {
  const connections = whiteboardId 
    ? (await dataService.getWhiteboard(whiteboardId, { includeConnections: true })).connections || []
    : await dataService.getConnections();

  // Simple clustering coefficient calculation
  // In a real implementation, this would be more sophisticated
  if (connections.length === 0) return 0;

  // Build adjacency list
  const adjacency: Record<string, Set<string>> = {};
  
  for (const connection of connections) {
    if (!adjacency[connection.beginId]) adjacency[connection.beginId] = new Set();
    if (!adjacency[connection.endId]) adjacency[connection.endId] = new Set();
    
    adjacency[connection.beginId].add(connection.endId);
    adjacency[connection.endId].add(connection.beginId);
  }

  // Calculate local clustering coefficient for each node
  let totalClustering = 0;
  let nodeCount = 0;

  for (const [node, neighbors] of Object.entries(adjacency)) {
    if (neighbors.size < 2) continue;

    let triangles = 0;
    const neighborArray = Array.from(neighbors);
    
    for (let i = 0; i < neighborArray.length; i++) {
      for (let j = i + 1; j < neighborArray.length; j++) {
        if (adjacency[neighborArray[i]]?.has(neighborArray[j])) {
          triangles++;
        }
      }
    }

    const possibleTriangles = (neighbors.size * (neighbors.size - 1)) / 2;
    totalClustering += triangles / possibleTriangles;
    nodeCount++;
  }

  return nodeCount > 0 ? totalClustering / nodeCount : 0;
}