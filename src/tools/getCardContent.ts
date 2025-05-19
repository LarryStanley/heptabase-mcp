import { z } from 'zod';
import { HeptabaseDataService } from '../services/HeptabaseDataService';
import { parseHeptabaseContentToMarkdown } from '../utils/contentParser';

export const getCardContentSchema = z.object({
  cardId: z.string(),
  format: z.enum(['raw', 'markdown', 'json']).default('markdown')
});

export async function getCardContentHandler(
  params: z.infer<typeof getCardContentSchema>,
  dataService: HeptabaseDataService
) {
  const result = await dataService.getCard(params.cardId);
  const card = result.card;
  
  if (!card) {
    throw new Error('Card not found');
  }
  
  let content: string;
  let mimeType: string = 'text/plain';
  
  switch (params.format) {
    case 'raw':
      content = card.content;
      mimeType = 'text/plain';
      break;
      
    case 'json':
      const cardData = {
        id: card.id,
        title: card.title,
        content: JSON.parse(card.content),
        createdTime: card.createdTime,
        lastEditedTime: card.lastEditedTime,
        instances: result.instances.length
      };
      content = JSON.stringify(cardData, null, 2);
      mimeType = 'application/json';
      break;
      
    case 'markdown':
    default:
      content = `# ${card.title || 'Untitled'}\n\n`;
      content += parseHeptabaseContentToMarkdown(card.content);
      content += `\n\n---\n`;
      content += `Created: ${card.createdTime}\n`;
      content += `Last edited: ${card.lastEditedTime}\n`;
      content += `Card ID: ${card.id}\n`;
      if (result.instances.length > 0) {
        content += `\nAppears on ${result.instances.length} whiteboard(s)\n`;
      }
      mimeType = 'text/markdown';
      break;
  }
  
  return {
    content: [{
      type: 'resource',
      resource: {
        uri: `heptabase://card/${card.id}`,
        mimeType,
        text: content
      }
    }]
  };
}