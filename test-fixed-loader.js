#!/usr/bin/env node

const HeptabaseDataService = require('./dist/services/HeptabaseDataService').HeptabaseDataService;
const path = require('path');

async function testDataLoader() {
    console.log('Testing HeptabaseDataService with actual Heptabase backup...\n');
    
    const service = new HeptabaseDataService({
        dataPath: '/Users/stanley/Code/side project/heptabase-mcp/data/extracted/Heptabase-Data-Backup-2025-05-18T14-49-23-577Z',
        cacheEnabled: true,
        cacheTTL: 3600
    });
    
    try {
        await service.loadData();
        console.log('Data loaded successfully!');
        
        // Test whiteboard search
        const whiteboards = await service.searchWhiteboards({ query: 'Vibe Coding' });
        console.log(`\nFound ${whiteboards.length} whiteboard(s) matching 'Vibe Coding'`);
        if (whiteboards.length > 0) {
            console.log('First whiteboard:', whiteboards[0]);
        }
        
        // Get specific whiteboard
        const result = await service.getWhiteboard('5bb10dc1-a6e0-4f76-ad54-ea09e7c5d29b', {
            includeCards: true,
            includeConnections: true
        });
        console.log('\nWhiteboard details:');
        console.log(`Name: ${result.whiteboard.name}`);
        console.log(`ID: ${result.whiteboard.id}`);
        console.log(`Cards: ${result.cards?.length || 0}`);
        console.log(`Connections: ${result.connections?.length || 0}`);
        
        // Get debug info
        const stats = service.getDebugInfo();
        console.log('\nDebug info:');
        console.log(JSON.stringify(stats, null, 2));
        
    } catch (error) {
        console.error('Error:', error);
        console.error('Stack trace:', error.stack);
    }
}

testDataLoader();