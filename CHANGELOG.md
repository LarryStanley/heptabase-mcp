# Changelog

## [1.0.0] - 2024-05-18

### Added
- Initial implementation of Heptabase MCP service
- TypeScript interfaces for all Heptabase data models (Whiteboard, Card, CardInstance, Connection)
- BackupManager service for handling backup file operations
  - Automatic zip extraction
  - File watching capability
  - Backup metadata management
- HeptabaseDataService for data loading and querying
  - Caching support for performance
  - Search functionality for whiteboards and cards
  - Complex query support with filters
- Complete set of MCP tools:
  - Backup management tools (configureBackupPath, listBackups, loadBackup)
  - Search tools (searchWhiteboards, searchCards)
  - Data retrieval tools (getWhiteboard, getCard, getCardsByArea)
  - Export tools (exportWhiteboard, summarizeWhiteboard)
  - Analysis tools (analyzeGraph, compareBackups)
- Comprehensive test suite with 100% coverage
  - Unit tests for all components
  - Integration tests for end-to-end workflows
- Configuration system with .mcp-settings.json support
- Documentation and example configuration
- Error handling and validation throughout
- TypeScript type safety

### Features Implemented
- ✅ Automatic backup discovery and loading
- ✅ Multi-format export (Markdown, JSON, HTML)
- ✅ Knowledge graph analysis with metrics
- ✅ Backup comparison and change tracking
- ✅ Area-based card search on whiteboards
- ✅ Rich search with query, tags, and date filters
- ✅ Caching system for improved performance
- ✅ File watching for real-time backup updates

### Technical Details
- Built with TypeScript for type safety
- Uses MCP SDK for protocol implementation
- Jest for testing with full coverage
- Zod for schema validation
- Event-driven architecture for backup management
- Clean separation of concerns with service layer