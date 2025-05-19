#!/usr/bin/env node

const { parseHeptabaseContentToMarkdown } = require('./dist/utils/contentParser');
const { HeptabaseDataService } = require('./dist/services/HeptabaseDataService');

async function testCardParser() {
    console.log('Testing card content parser...\n');
    
    const service = new HeptabaseDataService({
        dataPath: '/Users/stanley/Code/side project/heptabase-mcp/data/extracted/Heptabase-Data-Backup-2025-05-18T14-49-23-577Z',
        cacheEnabled: true,
        cacheTTL: 3600
    });
    
    try {
        await service.loadData();
        
        // Test with the card from the user's example
        const cardIds = ['007a085c-a991-414d-87ba-046d916c8f55', '9f1bffda-a28d-4308-af40-84deec96bfa1'];
        
        for (const cardId of cardIds) {
            const result = await service.getCard(cardId);
            console.log(`Card: ${result.card.title}`);
            console.log('Raw content:', result.card.content.substring(0, 200) + '...');
            console.log('\nParsed Markdown:');
            console.log(parseHeptabaseContentToMarkdown(result.card.content));
            console.log('\n---\n');
        }
        
    } catch (error) {
        console.error('Error:', error);
        console.error('Stack trace:', error.stack);
    }
}

testCardParser();