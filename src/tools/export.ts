import { z } from 'zod';
import { HeptabaseDataService } from '../services/HeptabaseDataService';
import { promises as fs } from 'fs';
import * as path from 'path';

export const exportWhiteboardSchema = z.object({
  whiteboardId: z.string(),
  format: z.enum(['markdown', 'json', 'html']).optional().default('markdown'),
  includeCards: z.boolean().optional().default(true),
  includeConnections: z.boolean().optional().default(false),
  includeMetadata: z.boolean().optional().default(false),
  outputPath: z.string()
});

export const summarizeWhiteboardSchema = z.object({
  whiteboardId: z.string(),
  format: z.enum(['text', 'structured']).optional().default('text'),
  includeStatistics: z.boolean().optional().default(false)
});

export async function exportWhiteboard(
  dataService: HeptabaseDataService,
  params: z.infer<typeof exportWhiteboardSchema>
) {
  const data = await dataService.getWhiteboard(params.whiteboardId, {
    includeCards: params.includeCards,
    includeConnections: params.includeConnections
  });

  let content = '';
  
  switch (params.format) {
    case 'markdown':
      content = await generateMarkdownExport(data, params);
      break;
    case 'json':
      content = JSON.stringify(data, null, 2);
      break;
    case 'html':
      content = await generateHtmlExport(data, params);
      break;
  }

  await fs.mkdir(path.dirname(params.outputPath), { recursive: true });
  await fs.writeFile(params.outputPath, content, 'utf8');

  const response = [`Exported whiteboard to ${params.outputPath}`];
  if (params.includeMetadata) {
    response.push('Included metadata in export');
  }

  return {
    content: [{
      type: 'text',
      text: response.join('\n')
    }]
  };
}

export async function summarizeWhiteboard(
  dataService: HeptabaseDataService,
  params: z.infer<typeof summarizeWhiteboardSchema>
) {
  const data = await dataService.getWhiteboard(params.whiteboardId, {
    includeCards: true,
    includeConnections: true
  });

  let summary = '';
  
  if (params.format === 'text') {
    summary = await generateTextSummary(data, params);
  } else {
    summary = await generateStructuredSummary(data, params);
  }

  return {
    content: [{
      type: 'text',
      text: summary
    }]
  };
}

async function generateMarkdownExport(data: any, params: any): Promise<string> {
  const lines: string[] = [];
  
  lines.push(`# ${data.whiteboard.name}`);
  lines.push('');
  
  if (params.includeMetadata) {
    lines.push('## Metadata');
    lines.push(`- Created: ${data.whiteboard.createdTime}`);
    lines.push(`- Last Modified: ${data.whiteboard.lastEditedTime}`);
    lines.push(`- Created By: ${data.whiteboard.createdBy}`);
    lines.push('');
  }
  
  if (data.cards?.length > 0) {
    lines.push('## Cards');
    lines.push('');
    
    for (const card of data.cards) {
      lines.push(`### ${card.title}`);
      
      const content = JSON.parse(card.content);
      const text = extractTextFromContent(content);
      lines.push(text);
      lines.push('');
    }
  }
  
  if (data.connections?.length > 0) {
    lines.push('## Connections');
    lines.push('');
    
    for (const connection of data.connections) {
      lines.push(`- ${connection.beginId} → ${connection.endId}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

async function generateHtmlExport(data: any, params: any): Promise<string> {
  const lines: string[] = [];
  
  lines.push('<!DOCTYPE html>');
  lines.push('<html>');
  lines.push('<head>');
  lines.push(`<title>${data.whiteboard.name}</title>`);
  lines.push('</head>');
  lines.push('<body>');
  lines.push(`<h1>${data.whiteboard.name}</h1>`);
  
  if (params.includeMetadata) {
    lines.push('<div class="metadata">');
    lines.push(`<p>Created: ${data.whiteboard.createdTime}</p>`);
    lines.push(`<p>Last Modified: ${data.whiteboard.lastEditedTime}</p>`);
    lines.push(`<p>Created By: ${data.whiteboard.createdBy}</p>`);
    lines.push('</div>');
  }
  
  if (data.cards?.length > 0) {
    lines.push('<h2>Cards</h2>');
    
    for (const card of data.cards) {
      lines.push(`<div class="card">`);
      lines.push(`<h3>${card.title}</h3>`);
      
      const content = JSON.parse(card.content);
      const text = extractTextFromContent(content);
      lines.push(`<p>${text}</p>`);
      lines.push('</div>');
    }
  }
  
  lines.push('</body>');
  lines.push('</html>');
  
  return lines.join('\n');
}

async function generateTextSummary(data: any, params: any): Promise<string> {
  const lines: string[] = [];
  
  lines.push(`${data.whiteboard.name}`);
  lines.push('');
  
  const cardCount = data.cards?.length || 0;
  const connectionCount = data.connections?.length || 0;
  
  lines.push(`Summary: ${cardCount} cards, ${connectionCount} connections`);
  lines.push('');
  
  if (params.includeStatistics) {
    let totalWords = 0;
    let totalChars = 0;
    
    if (data.cards) {
      for (const card of data.cards) {
        const content = JSON.parse(card.content);
        const text = extractTextFromContent(content);
        totalWords += text.split(/\s+/).length;
        totalChars += text.length;
      }
    }
    
    lines.push('Statistics:');
    lines.push(`- Word count: ${totalWords}`);
    lines.push(`- Character count: ${totalChars}`);
    lines.push('');
  }
  
  if (data.cards?.length > 0) {
    lines.push('Cards:');
    for (const card of data.cards) {
      lines.push(`- ${card.title}`);
    }
  }
  
  return lines.join('\n');
}

async function generateStructuredSummary(data: any, params: any): Promise<string> {
  const lines: string[] = [];
  
  lines.push('# Summary: ' + data.whiteboard.name);
  lines.push('');
  
  lines.push('## Overview');
  lines.push(`- Total Cards: ${data.cards?.length || 0}`);
  lines.push(`- Total Connections: ${data.connections?.length || 0}`);
  lines.push('');
  
  lines.push('## Key Topics');
  if (data.cards?.length > 0) {
    for (const card of data.cards.slice(0, 5)) {
      lines.push(`- ${card.title}`);
    }
    if (data.cards.length > 5) {
      lines.push(`- ... and ${data.cards.length - 5} more`);
    }
  }
  lines.push('');
  
  lines.push('## Statistics');
  const cardCount = data.cards?.length || 0;
  const connectionCount = data.connections?.length || 0;
  lines.push(`- ${cardCount} cards`);
  lines.push(`- ${connectionCount} connections`);
  
  if (params.includeStatistics) {
    // Calculate additional statistics
    let totalWords = 0;
    let totalChars = 0;
    
    if (data.cards) {
      for (const card of data.cards) {
        const content = JSON.parse(card.content);
        const text = extractTextFromContent(content);
        totalWords += text.split(/\s+/).length;
        totalChars += text.length;
      }
    }
    
    lines.push(`- Word count: ${totalWords}`);
    lines.push(`- Character count: ${totalChars}`);
  }
  
  return lines.join('\n');
}

function extractTextFromContent(content: any): string {
  if (typeof content === 'string') {
    return content;
  }
  
  if (content.text) {
    return content.text;
  }
  
  if (content.content && Array.isArray(content.content)) {
    return content.content
      .map((item: any) => extractTextFromContent(item))
      .filter(Boolean)
      .join(' ');
  }
  
  return '';
}