/**
 * IndexedDB Management for Offline QR Scanner
 * 
 * Provides a robust local database for storing:
 * - Entry passes (for offline validation)
 * - Pending scans (for offline queueing)
 * - Sync metadata (for tracking sync state)
 */

import Dexie, { Table } from 'dexie';
import { ValidationRule } from './validationRules';

// TypeScript interfaces
export interface EntryPass {
  pass_token: string; // Primary key
  participant_name: string;
  pass_type: 'regular' | 'vip';
  is_active: boolean;
  is_used: boolean;
  created_at?: string;
  last_sync_time?: number;
}

export interface PendingScan {
  id?: number; // Auto-increment
  pass_token: string;
  participant_name: string;
  pass_type: string;
  timestamp: string;
  security_username: string;
  validation_method: 'online' | 'offline';
  result: 'valid' | 'invalid' | 'already_used' | 'inactive';
  synced: boolean;
  sync_attempts: number;
  device_info: string;
}

export interface SyncMetadata {
  key: string; // Primary key
  value: any;
  updated_at: number;
}

// IndexedDB Database Class
class SecurityScannerDB extends Dexie {
  passes!: Table<EntryPass, string>;
  pending_scans!: Table<PendingScan, number>;
  sync_metadata!: Table<SyncMetadata, string>;
  rules!: Table<ValidationRule, string>;

  constructor() {
    super('SecurityScanner');
    
    // Define database schema
    this.version(1).stores({
      passes: 'pass_token, participant_name, is_used, pass_type',
      pending_scans: '++id, pass_token, timestamp, synced',
      sync_metadata: 'key'
    });
    
    // Version 2: Add validation rules
    this.version(2).stores({
      rules: 'id, is_active'
    });
  }
}

// Create singleton instance
export const db = new SecurityScannerDB();

/**
 * Initialize database and verify it's working
 */
export async function initializeDB(): Promise<boolean> {
  try {
    await db.open();
    console.log('✅ IndexedDB initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize IndexedDB:', error);
    return false;
  }
}

/**
 * Store passes in local database
 */
export async function storePasses(passes: EntryPass[]): Promise<void> {
  try {
    const timestamp = Date.now();
    const passesWithTimestamp = passes.map(pass => ({
      ...pass,
      last_sync_time: timestamp
    }));
    
    await db.passes.bulkPut(passesWithTimestamp);
    console.log(`✅ Stored ${passes.length} passes in IndexedDB`);
  } catch (error) {
    console.error('❌ Failed to store passes:', error);
    throw error;
  }
}

/**
 * Get pass by token
 */
export async function getPassByToken(token: string): Promise<EntryPass | undefined> {
  try {
    return await db.passes.get(token);
  } catch (error) {
    console.error('❌ Failed to get pass:', error);
    return undefined;
  }
}

/**
 * Mark pass as used locally
 */
export async function markPassAsUsedLocally(token: string): Promise<void> {
  try {
    await db.passes.update(token, { is_used: true });
    console.log(`✅ Marked pass ${token} as used locally`);
  } catch (error) {
    console.error('❌ Failed to mark pass as used:', error);
    throw error;
  }
}

/**
 * Update local pass with server data
 */
export async function updateLocalPass(pass: Partial<EntryPass> & { pass_token: string }): Promise<void> {
  try {
    await db.passes.update(pass.pass_token, pass);
    console.log(`✅ Updated local pass ${pass.pass_token}`);
  } catch (error) {
    console.error('❌ Failed to update pass:', error);
  }
}

/**
 * Get total pass count
 */
export async function getPassCount(): Promise<number> {
  try {
    return await db.passes.count();
  } catch (error) {
    console.error('❌ Failed to count passes:', error);
    return 0;
  }
}

/**
 * Queue a scan for later sync
 */
export async function queueScan(scan: Omit<PendingScan, 'id' | 'synced' | 'sync_attempts'>): Promise<number> {
  try {
    const scanWithDefaults: Omit<PendingScan, 'id'> = {
      ...scan,
      synced: false,
      sync_attempts: 0
    };
    
    const id = await db.pending_scans.add(scanWithDefaults as PendingScan);
    console.log(`✅ Queued scan ${id} for sync`);
    return id;
  } catch (error) {
    console.error('❌ Failed to queue scan:', error);
    throw error;
  }
}

/**
 * Get all pending (unsynced) scans
 */
export async function getPendingScans(): Promise<PendingScan[]> {
  try {
    return await db.pending_scans
      .where('synced')
      .equals(0) // 0 = false in IndexedDB
      .toArray();
  } catch (error) {
    console.error('❌ Failed to get pending scans:', error);
    return [];
  }
}

/**
 * Check if a pass token exists in pending queue
 */
export async function isInPendingQueue(token: string): Promise<PendingScan | undefined> {
  try {
    return await db.pending_scans
      .where('pass_token')
      .equals(token)
      .filter(scan => scan.synced === false)
      .first();
  } catch (error) {
    console.error('❌ Failed to check pending queue:', error);
    return undefined;
  }
}

/**
 * Mark scan as synced
 */
export async function markScanAsSynced(id: number): Promise<void> {
  try {
    await db.pending_scans.update(id, { synced: true });
    console.log(`✅ Marked scan ${id} as synced`);
  } catch (error) {
    console.error('❌ Failed to mark scan as synced:', error);
  }
}

/**
 * Increment sync attempts for a scan
 */
export async function incrementSyncAttempts(id: number): Promise<void> {
  try {
    const scan = await db.pending_scans.get(id);
    if (scan) {
      await db.pending_scans.update(id, {
        sync_attempts: (scan.sync_attempts || 0) + 1
      });
    }
  } catch (error) {
    console.error('❌ Failed to increment sync attempts:', error);
  }
}

/**
 * Get sync metadata
 */
export async function getSyncMetadata(): Promise<{ lastSync: number; passCount: number }> {
  try {
    const lastSyncMeta = await db.sync_metadata.get('last_sync_time');
    const passCount = await getPassCount();
    
    return {
      lastSync: lastSyncMeta?.value || 0,
      passCount
    };
  } catch (error) {
    console.error('❌ Failed to get sync metadata:', error);
    return { lastSync: 0, passCount: 0 };
  }
}

/**
 * Set last sync time
 */
export async function setLastSyncTime(timestamp: number): Promise<void> {
  try {
    await db.sync_metadata.put({
      key: 'last_sync_time',
      value: timestamp,
      updated_at: timestamp
    });
    console.log(`✅ Updated last sync time: ${new Date(timestamp).toLocaleString()}`);
  } catch (error) {
    console.error('❌ Failed to set sync time:', error);
  }
}

/**
 * Clear all passes (for re-sync)
 */
export async function clearAllPasses(): Promise<void> {
  try {
    await db.passes.clear();
    console.log('✅ Cleared all passes from IndexedDB');
  } catch (error) {
    console.error('❌ Failed to clear passes:', error);
    throw error;
  }
}

/**
 * Clear pending scans (use with caution!)
 */
export async function clearPendingScans(): Promise<void> {
  try {
    await db.pending_scans.clear();
    console.log('✅ Cleared all pending scans');
  } catch (error) {
    console.error('❌ Failed to clear pending scans:', error);
    throw error;
  }
}

/**
 * Clear synced scans (cleanup old records)
 */
export async function clearSyncedScans(): Promise<void> {
  try {
    const syncedScans = await db.pending_scans
      .where('synced')
      .equals(1) // 1 = true in IndexedDB
      .toArray();
    
    const ids = syncedScans.map(scan => scan.id!);
    await db.pending_scans.bulkDelete(ids);
    
    console.log(`✅ Cleared ${ids.length} synced scans`);
  } catch (error) {
    console.error('❌ Failed to clear synced scans:', error);
  }
}

/**
 * Get database statistics
 */
export async function getDBStats() {
  try {
    const passCount = await db.passes.count();
    const pendingCount = await db.pending_scans.where('synced').equals(0).count();
    const syncedCount = await db.pending_scans.where('synced').equals(1).count();
    const metadata = await getSyncMetadata();
    
    return {
      totalPasses: passCount,
      pendingScans: pendingCount,
      syncedScans: syncedCount,
      lastSyncTime: metadata.lastSync,
      cacheAge: metadata.lastSync ? Date.now() - metadata.lastSync : null
    };
  } catch (error) {
    console.error('❌ Failed to get DB stats:', error);
    return {
      totalPasses: 0,
      pendingScans: 0,
      syncedScans: 0,
      lastSyncTime: 0,
      cacheAge: null
    };
  }
}

/**
 * Validate cache integrity
 */
export async function validateCacheIntegrity(): Promise<{ valid: boolean; message: string }> {
  try {
    const stats = await getDBStats();
    
    // Check 1: Do we have any passes?
    if (stats.totalPasses === 0) {
      return {
        valid: false,
        message: 'No cached data available. Please sync passes.'
      };
    }
    
    // Check 2: Is cache too old? (>24 hours)
    if (stats.cacheAge && stats.cacheAge > 24 * 60 * 60 * 1000) {
      const hours = Math.round(stats.cacheAge / (60 * 60 * 1000));
      return {
        valid: false,
        message: `Cache is ${hours} hours old. Please refresh.`
      };
    }
    
    return {
      valid: true,
      message: 'Cache is valid'
    };
  } catch (error) {
    return {
      valid: false,
      message: 'Failed to validate cache'
    };
  }
}

// Initialize DB on first use (Lazy)
// initializeDB();

export async function storeRules(rules: ValidationRule[]): Promise<void> {
  try {
    await db.rules.clear();
    await db.rules.bulkPut(rules);
    console.log(`✅ Stored ${rules.length} validation rules`);
  } catch (error) {
    console.error('❌ Failed to store rules:', error);
  }
}

export async function getStoredRules(): Promise<ValidationRule[]> {
  try {
    return await db.rules.toArray();
  } catch (error) {
    return [];
  }
}


