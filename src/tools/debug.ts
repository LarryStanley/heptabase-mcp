import { HeptabaseMcpServer } from '@/server';

export async function debugDataService(server: HeptabaseMcpServer): Promise<any> {
  try {
    // Check backup manager
    if (!server.backupManager) {
      return { error: 'Backup manager not initialized' };
    }
    
    // List available backups
    const backups = await server.backupManager.listBackups();
    
    // Check data service
    let dataServiceInfo: any = {};
    if (!server.dataService) {
      dataServiceInfo = { status: 'Not initialized' };
    } else {
      const data = server.dataService.getData();
      dataServiceInfo = {
        status: 'Initialized',
        whiteboardCount: Object.keys(data.whiteboards).length,
        cardCount: Object.keys(data.cards).length,
        cardInstanceCount: Object.keys(data.cardInstances).length,
        connectionCount: Object.keys(data.connections).length,
        sampleWhiteboards: Object.values(data.whiteboards).slice(0, 3).map(wb => ({
          id: wb.id,
          name: wb.name,
          isTrashed: wb.isTrashed
        }))
      };
    }
    
    return {
      config: server.config,
      backupCount: backups.length,
      latestBackup: backups[0] || null,
      dataService: dataServiceInfo
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}