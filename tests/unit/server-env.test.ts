import { HeptabaseMcpServer } from '@/server';

jest.mock('fs-extra', () => ({
  ...jest.requireActual('fs-extra'),
  readFile: jest.fn().mockRejectedValue(new Error('No config file'))
}));

describe('Environment Variable Configuration', () => {
  let server: HeptabaseMcpServer;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    // Clear any existing env vars that might interfere
    delete process.env.HEPTABASE_BACKUP_PATH;
    delete process.env.HEPTABASE_AUTO_EXTRACT;
    delete process.env.HEPTABASE_WATCH_DIRECTORY;
    delete process.env.HEPTABASE_MAX_BACKUPS;
    delete process.env.HEPTABASE_CACHE_TTL;
    delete process.env.HEPTABASE_TIMEZONE;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should load configuration from environment variables', async () => {
    // Set test environment variables
    process.env.HEPTABASE_BACKUP_PATH = '/test/backup/path';
    process.env.HEPTABASE_AUTO_EXTRACT = 'false';
    process.env.HEPTABASE_WATCH_DIRECTORY = 'true';
    process.env.HEPTABASE_MAX_BACKUPS = '5';
    process.env.HEPTABASE_CACHE_TTL = '7200';
    process.env.HEPTABASE_TIMEZONE = 'America/New_York';

    server = new HeptabaseMcpServer();
    await server.initialize();

    expect(server.config.backupPath).toBe('/test/backup/path');
    expect(server.config.autoExtract).toBe(false);
    expect(server.config.watchDirectory).toBe(true);
    expect(server.config.maxBackups).toBe(5);
    expect(server.config.cacheTTL).toBe(7200);
    expect(server.config.timezone).toBe('America/New_York');
  });

  it('should use default values when env variables are not set', async () => {
    // Clear all relevant env variables
    delete process.env.HEPTABASE_BACKUP_PATH;
    delete process.env.HEPTABASE_AUTO_EXTRACT;
    delete process.env.HEPTABASE_WATCH_DIRECTORY;

    server = new HeptabaseMcpServer();
    await server.initialize();

    const defaults = server.getDefaultConfig();
    expect(server.config.autoExtract).toBe(defaults.autoExtract);
    expect(server.config.watchDirectory).toBe(defaults.watchDirectory);
  });

  it('should handle invalid boolean environment variables', async () => {
    process.env.HEPTABASE_AUTO_EXTRACT = 'invalid';
    process.env.HEPTABASE_WATCH_DIRECTORY = '1'; // Should be treated as truthy

    server = new HeptabaseMcpServer();
    await server.initialize();

    expect(server.config.autoExtract).toBe(false); // Invalid string becomes false
    expect(server.config.watchDirectory).toBe(false); // '1' is not 'true', so false
  });

  it('should handle invalid number environment variables', async () => {
    process.env.HEPTABASE_MAX_BACKUPS = 'not-a-number';
    process.env.HEPTABASE_CACHE_TTL = '3600.5';

    server = new HeptabaseMcpServer();
    await server.initialize();

    const defaults = server.getDefaultConfig();
    expect(server.config.maxBackups).toBe(defaults.maxBackups); // Falls back to default
    expect(server.config.cacheTTL).toBe(3600); // Decimal is truncated by parseInt
  });

  it('should prioritize file config over env config', async () => {
    // Set environment variable
    process.env.HEPTABASE_BACKUP_PATH = '/env/backup/path';

    // Mock file config
    const fileConfig = {
      backupPath: '/file/backup/path'
    };

    server = new HeptabaseMcpServer();
    jest.spyOn(server as any, 'loadConfiguration').mockResolvedValue(fileConfig);

    await server.initialize();

    // File config should override env config
    expect(server.config.backupPath).toBe('/file/backup/path');
  });
});