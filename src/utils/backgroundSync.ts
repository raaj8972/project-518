/**
 * Background Sync Utilities
 * Uses Service Worker Background Sync API for reliable offline syncing
 */

/**
 * Register background sync for pending scans
 * This will automatically trigger when connection is restored
 */
export async function registerBackgroundSync(tag: string = 'sync-scans'): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.warn('Background Sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register(tag);
    console.log(`✅ Background sync registered: ${tag}`);
    return true;
  } catch (error) {
    console.error('Failed to register background sync:', error);
    return false;
  }
}

/**
 * Check if background sync is supported
 */
export function isBackgroundSyncSupported(): boolean {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}

/**
 * Get pending sync registrations
 */
export async function getPendingSyncTags(): Promise<string[]> {
  if (!isBackgroundSyncSupported()) return [];

  try {
    const registration = await navigator.serviceWorker.ready;
    const tags = await (registration as any).sync.getTags();
    return tags;
  } catch (error) {
    console.error('Failed to get sync tags:', error);
    return [];
  }
}

/**
 * Enhanced queue scan with background sync registration
 */
export async function queueScanWithBackgroundSync(scanData: any): Promise<void> {
  // Import the regular queue function
  const { queueScan } = await import('./offlineStorage');
  
  // Queue the scan in IndexedDB
  await queueScan(scanData);
  
  // Register for background sync
  await registerBackgroundSync('sync-scans');
}
