/**
 * Offline Storage Utilities
 * 
 * High-level functions for managing offline pass validation
 */

import { supabase } from '../lib/supabase';
import { dualRead } from '../lib/dualDb';
import { registerBackgroundSync, isBackgroundSyncSupported } from './backgroundSync';
import { evaluateRules } from './validationRules';
import {
  storePasses,
  getPassByToken,
  markPassAsUsedLocally,
  queueScan,
  getPendingScans,
  isInPendingQueue,
  markScanAsSynced,
  incrementSyncAttempts,
  getSyncMetadata,
  setLastSyncTime,
  clearAllPasses,
  getDBStats,
  validateCacheIntegrity,
  storeRules,
  getStoredRules,
  searchPassesLocally,
  type EntryPass,
  db
} from './offlineDB';


/**
 * Sync passes from server to local IndexedDB
 * Uses incremental syncing if possible to reduce egress
 */
export async function syncPassesFromServer(forceRefresh: boolean = false): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log('🔄 Syncing passes from server...');
    
    // Sync validation rules and settings first
    await syncRulesFromServer();
    await syncSettingsFromServer();
    
    // Get sync metadata
    const metadata = await getSyncMetadata();
    const isIncremental = !forceRefresh && metadata.lastSync > 0;
    
    // Fetch passes with optimization
    const options: any = {
      table: 'entry_passes',
      select: 'pass_token, participant_name, pass_type, is_active, is_used, created_at, updated_at, valid_date, day_number, scanned_at, scanned_by'
    };

    if (isIncremental) {
      // Use ISO string for date comparisons
      const lastSyncDate = new Date(metadata.lastSync).toISOString();
      options.gt = ['updated_at', lastSyncDate];
      console.log(`📡 Fetching incremental updates since ${lastSyncDate}`);
    } else {
      console.log('📡 Performing full pass sync');
    }

    const passes: EntryPass[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data: page } = await dualRead({ ...options, forceRefresh: true, range: [offset, offset + 999] });
      if (!Array.isArray(page)) throw new Error('Failed to fetch passes');
      passes.push(...page);
      if (page.length < 1000) break;
    }

    if (!passes) {
      if (isIncremental) {
        console.log('ℹ️ No new updates found');
        return { success: true, count: 0 };
      }
      return { success: false, count: 0, error: 'Failed to fetch passes from server' };
    }

    if (passes.length === 0) {
      console.log('ℹ️ Sync complete - no new records');
      await setLastSyncTime(Date.now());
      return { success: true, count: 0 };
    }

    // Store passes (bulkPut handles updates automatically)
    if (!isIncremental) {
      await clearAllPasses();
    }
    await storePasses(passes as EntryPass[]);

    // Update sync metadata
    await setLastSyncTime(Date.now());

    console.log(`✅ Synced ${passes.length} passes from server`);
    
    return {
      success: true,
      count: passes.length
    };
  } catch (error: any) {
    console.error('❌ Failed to sync passes from server:', error);
    return {
      success: false,
      count: 0,
      error: error.message || 'Sync failed'
    };
  }
}

/**
 * Validate pass offline using local cache
 */
export async function validatePassOffline(
  token: string,
  securityUsername: string,
  guardName?: string
): Promise<{
  valid: boolean;
  result: 'valid' | 'invalid' | 'already_used' | 'inactive' | 'error';
  message: string;
  name?: string;
  pass_type?: string;
}> {
  try {
    // Parse Token Logic for Day-Specific QR support (token|YYYY-MM-DD)
    let searchToken = token.trim();
    let restrictedDateSuffix: string | null = null;

    if (searchToken.includes('|')) {
       const parts = searchToken.split('|');
       if (parts.length === 2) {
          searchToken = parts[0];
          restrictedDateSuffix = parts[1];
          console.log('🔹 Split Token:', { token: searchToken, date: restrictedDateSuffix });
       } else {
          console.warn('⚠️ Token has | but split failed:', parts);
       }
    }

    // Check cache integrity first
    const cacheCheck = await validateCacheIntegrity();
    if (!cacheCheck.valid) {
      return {
        valid: false,
        result: 'error',
        message: cacheCheck.message
      };
    }

    // Indian Standard Time is UTC+5:30
    const now = new Date();
    const todayStr = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];

    // STRICT DATE CHECK for Multi-Day Pass Split
    if (restrictedDateSuffix) {
        console.log('📅 Date Validation:', { qrDate: restrictedDateSuffix, today: todayStr });

       if (restrictedDateSuffix !== todayStr) {
          return {
             valid: false,
             result: 'invalid',
             message: `Valid for ${restrictedDateSuffix} only`,
             name: 'Wrong Day Pass'
          };
       }
    }

    // Check if pass exists in local cache
    console.log('🔍 DB Lookup for:', searchToken);
    const pass = await getPassByToken(searchToken); // use parsed token
    
    if (!pass) {
      // Check if DB is empty - give better error message
      const stats = await getDBStats();
      if (stats.totalPasses === 0) {
          return {
            valid: false,
            result: 'error',
            message: 'OFFLINE: No Data. Please tap "Sync" button.'
          };
      }

      return {
        valid: false,
        result: 'invalid', // True invalid or not in sync
        message: 'Invalid Pass (or not synced)'
      };
    }

    // 1. Check if pass is inactive
    if (!pass.is_active) {
      return {
        valid: false,
        result: 'inactive',
        message: 'Pass deactivated',
        name: pass.participant_name
      };
    }

    // 2. STRICT ONE-TIME USE CHECK
    if ((pass.is_used || pass.scanned_at) && (pass.valid_date || !pass.scanned_at || new Date(pass.scanned_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))) {
      return {
        valid: false,
        result: 'already_used',
        message: `Pass already used: ${pass.participant_name}`,
        name: pass.participant_name
      };
    }

    // 3. Check if in pending queue (scanned offline but not synced yet)
    const pendingScan = await isInPendingQueue(searchToken);
    if (pendingScan) {
      const scanTime = new Date(pendingScan.timestamp).toLocaleTimeString();
      return {
        valid: false,
        result: 'already_used',
        message: `Already scanned at ${scanTime}`,
        name: pass.participant_name
      };
    }

    // 4. DATE VALIDATION ("Not before and after")
    
    let targetDate: string | null = pass.valid_date || null;

    // If day_number is used, get date from cached settings
    if (!targetDate && pass.day_number) {
      const settings = (await db.sync_metadata.get('security_settings'))?.value;
      if (settings?.event_dates && settings.event_dates[pass.day_number - 1]) {
        targetDate = settings.event_dates[pass.day_number - 1];
      }
    }

    // Strict Date Check
    if (targetDate) {
      console.log('🔍 Offline Date Check:', { targetDate, todayStr });
      
      if (todayStr < targetDate) {
        return {
          valid: false,
          result: 'invalid',
          message: `Event not started (Valid for ${targetDate})`,
          name: pass.participant_name
        };
      } else if (todayStr > targetDate) {
        return {
          valid: false,
          result: 'invalid',
          message: `Pass expired (Valid for ${targetDate})`,
          name: pass.participant_name
        };
      }
    }

    // Fallback/Legacy: QR Suffix Date Check
    if (restrictedDateSuffix && restrictedDateSuffix !== todayStr) {
      return {
        valid: false,
        result: 'invalid',
        message: `Pass suffix identifies ${restrictedDateSuffix}`,
        name: pass.participant_name
      };
    }

    // Check validation rules (Offline)
    const storedRules = await getStoredRules();
    // Use stored rules if available, otherwise assume no restrictions (don't use hardcoded defaults)
    const activeRules = storedRules;
    
    const ruleResult = await evaluateRules(
      { pass_type: pass.pass_type, pass_token: token },
      activeRules
    );

    if (!ruleResult.valid) {
      return {
        valid: false,
        result: 'invalid', // Generic invalid for rule violation
        message: ruleResult.reason || 'Rule violation',
        name: pass.participant_name
      };
    }

    // ✅ VALID - Queue scan and mark as used locally
    await queueScan({
      pass_token: token,
      participant_name: pass.participant_name,
      pass_type: pass.pass_type,
      timestamp: new Date().toISOString(),
      security_username: securityUsername,
      validation_method: 'offline',
      result: 'valid',
      device_info: navigator.userAgent,
      guard_name: guardName
    });

    // Register background sync if supported
    if (isBackgroundSyncSupported()) {
      await registerBackgroundSync('sync-scans');
      console.log('📡 Background sync registered for automatic upload');
    }

    await markPassAsUsedLocally(token);

    console.log(`✅ Offline validation successful: ${pass.participant_name}`);

    return {
      valid: true,
      result: 'valid',
      message: 'Valid entry',
      name: pass.participant_name,
      pass_type: pass.pass_type
    };
  } catch (error: any) {
    console.error('❌ Offline validation error:', error);
    return {
      valid: false,
      result: 'error',
      message: 'Validation error occurred'
    };
  }
}

/**
 * Sync pending scans to server
 */
export async function syncPendingScansToServer(
  _securityUsername: string // Reserved for future conflict resolution
): Promise<{ success: boolean; synced: number; failed: number }> {
  try {
    const pending = await getPendingScans();
    
    if (pending.length === 0) {
      console.log('ℹ️ No pending scans to sync');
      return { success: true, synced: 0, failed: 0 };
    }

    console.log(`🔄 Syncing ${pending.length} pending scans...`);

    let synced = 0;
    let failed = 0;

    for (const scan of pending) {
      try {
        const { data, error } = await supabase.rpc('scan_entry_pass', {
          p_pass_token: scan.pass_token.split('|')[0], p_scanned_by: scan.security_username,
          p_scanned_at: scan.timestamp,
          p_client_scan_id: `${scan.security_username}:${scan.pass_token}:${scan.timestamp}`,
          p_guard_name: scan.guard_name || null
        });
        if (error) throw error;
        if (!data.valid) {
          // A resolved conflict must not be resent forever or count as a successful entry.
          await markScanAsSynced(scan.id!);
          failed++;
          continue;
        }

        // Success - mark as synced
        await markScanAsSynced(scan.id!);
        synced++;
        console.log(`✅ Synced scan ${scan.id}: ${scan.participant_name}`);
      } catch (error: any) {
        console.error(`❌ Failed to sync scan ${scan.id}:`, error);
        await incrementSyncAttempts(scan.id!);
        failed++;
      }
    }

    console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`);

    return {
      success: failed === 0,
      synced,
      failed
    };
  } catch (error: any) {
    console.error('❌ Sync pending scans error:', error);
    return {
      success: false,
      synced: 0,
      failed: 0
    };
  }
}

/**
 * Get sync statistics for UI display
 */
export async function getSyncStats() {
  const stats = await getDBStats();
  const metadata = await getSyncMetadata();
  
  let cacheAgeText = 'Never synced';
  if (metadata.lastSync) {
    const hours = Math.floor((Date.now() - metadata.lastSync) / (60 * 60 * 1000));
    const minutes = Math.floor((Date.now() - metadata.lastSync) / (60 * 1000)) % 60;
    
    if (hours > 0) {
      cacheAgeText = `${hours}h ${minutes}m ago`;
    } else if (minutes > 0) {
      cacheAgeText = `${minutes}m ago`;
    } else {
      cacheAgeText = 'Just now';
    }
  }
  
  return {
    totalPasses: stats.totalPasses,
    pendingScans: stats.pendingScans,
    lastSyncTime: metadata.lastSync,
    cacheAge: stats.cacheAge,
    cacheAgeText
  };
}

/**
 * Validate pass with online-first strategy
 */
export async function validatePassHybrid(
  rawToken: string,
  securityUsername: string,
  isOnline: boolean,
  guardName?: string
): Promise<{
  valid: boolean;
  result: 'valid' | 'invalid' | 'already_used' | 'inactive' | 'error' | 'rule_violation';
  message: string;
  name?: string;
  pass_type?: string;
  scanned_by?: string;
}> {
  // Parse Token Logic for Day-Specific QR support (token|YYYY-MM-DD)
  let token = rawToken.trim();
  let restrictedDateSuffix: string | null = null;
  
  if (token.includes('|')) {
     const parts = token.split('|');
     if (parts.length === 2) {
        token = parts[0];
        restrictedDateSuffix = parts[1];
     }
  }

  // STRICT DATE CHECK (Suffix)
  if (restrictedDateSuffix) {
     const today = new Date();
     const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
     
     if (restrictedDateSuffix !== todayStr) {
        return {
           valid: false,
           result: 'invalid', // True invalid
           message: `Valid for ${restrictedDateSuffix} only`,
           name: 'Wrong Day Pass'
        };
     }
  }

  // ONLINE - Try server validation first
  if (isOnline) {
    try {
      // Evaluate local restrictions before the server consumes the pass.
      const storedRules = await getStoredRules();
      if (storedRules.length) {
        let pass = await getPassByToken(token);
        if (!pass) {
          const { data, error } = await supabase.from('entry_passes').select('pass_type, pass_token').eq('pass_token', token).single();
          if (error) throw error;
          pass = data as EntryPass;
        }
        const rule = await evaluateRules({ pass_type: pass.pass_type, pass_token: token }, storedRules);
        if (!rule.valid) return { valid: false, result: 'rule_violation', message: rule.reason || 'Rule validation failed' };
      }
      // 1. Call RPC for atomic validation and consumption
      const { data, error } = await supabase.rpc('scan_entry_pass', {
        p_pass_token: token,
        p_scanned_by: securityUsername
      });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      if (!data.valid) {
        return {
          valid: false,
          result: data.result || 'invalid',
          message: data.message,
          name: data.name,
          pass_type: data.pass_type
        };
      }

      // 3. Mark pass as used locally in IndexedDB to prevent offline re-use
      await markPassAsUsedLocally(token).catch(console.error);
      
      // 4. Success
      return {
        valid: true,
        result: 'valid',
        message: 'Valid entry',
        name: data.name,
        pass_type: data.pass_type,
        scanned_by: securityUsername
      };
    } catch (error: any) {
      console.warn('Online validation failed, falling back to offline:', error);
      // Fallthrough to offline validation below
    }
  }

  // Offline validation
  console.log('📴 Using offline validation...');
  return await validatePassOffline(token, securityUsername, guardName);
}

export {
  getPassByToken,
  markPassAsUsedLocally,
  queueScan,
  getPendingScans,
  getSyncMetadata,
  setLastSyncTime,
  clearAllPasses,
  getDBStats,
  validateCacheIntegrity,
  searchPassesLocally,
};


/**
 * Sync validation rules from server
 */
export async function syncRulesFromServer(): Promise<void> {
  try {
    const { data } = await dualRead({
      table: 'validation_rules',
      eq: ['is_active', true]
    });
      
    if (data) {
      await storeRules(data);
    }
  } catch (err) {
    console.error('Failed to sync rules', err);
  }
}
/**
 * Sync security settings (event dates, venue, etc.) from server
 */
export async function syncSettingsFromServer(): Promise<void> {
  try {
    const { data: settings } = await dualRead({
      table: 'security_settings_public',
      limit: 1
    });
      
    if (settings && settings.length > 0) {
      const { db } = await import('./offlineDB');
      await db.sync_metadata.put({
        key: 'security_settings',
        value: settings[0],
        updated_at: Date.now()
      });
      console.log('✅ Security settings synced offline');
    }
  } catch (err) {
    console.error('Failed to sync security settings', err);
  }
}
