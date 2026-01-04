/**
 * Offline Storage Utilities
 * 
 * High-level functions for managing offline pass validation
 */

import { supabase } from '../lib/supabase';
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
  hasBeenScannedToday,
  type EntryPass
} from './offlineDB';


/**
 * Sync passes from Supabase to local IndexedDB
 */
export async function syncPassesFromServer(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log('🔄 Syncing passes from server...');
    
    // Sync validation rules first
    await syncRulesFromServer();
    
    // Fetch ALL passes from Supabase (not just active ones)
    // This ensures we can validate inactive/used passes offline too
    const { data: passes, error } = await supabase
      .from('entry_passes')
      .select('pass_token, participant_name, pass_type, is_active, is_used, created_at, valid_date');

    if (error) throw error;

    if (!passes || passes.length === 0) {
      console.warn('⚠️ No passes found in database');
      return {
        success: false,
        count: 0,
        error: 'No passes found. Please create passes first from Admin Dashboard.'
      };
    }

    // Clear old passes and store new ones
    await clearAllPasses();
    await storePasses(passes as EntryPass[]);

    // Update sync metadata
    await setLastSyncTime(Date.now());

    console.log(`✅ Synced ${passes.length} passes from server (${passes.filter(p => p.is_active).length} active)`);
    
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
    // Check cache integrity first
    const cacheCheck = await validateCacheIntegrity();
    if (!cacheCheck.valid) {
      return {
        valid: false,
        result: 'error',
        message: cacheCheck.message
      };
    }

    // Check if pass exists in local cache
    const pass = await getPassByToken(token.trim()); // TRIM WHITESPACE to fix scanning bugs
    
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

    // Check if pass is inactive
    if (!pass.is_active) {
      return {
        valid: false,
        result: 'inactive',
        message: 'Pass deactivated',
        name: pass.participant_name
      };
    }

    // Check restricted date
    if (pass.valid_date) {
      const today = new Date();
      // Adjust for Indian Standard Time (since event is in India)
      // Or just use local date string if devices are local.
      // Using 'en-CA' gives YYYY-MM-DD format which matches Supabase DATE type
      const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      
      if (pass.valid_date !== todayStr) {
        return {
           valid: false,
           result: 'invalid',
           message: `Valid for ${pass.valid_date} only`,
           name: pass.participant_name
        };
      }
    }

    // Check if already scanned TODAY (multi-day support)
    // Instead of blocking any used pass, we only block if it was already scanned today.
    const alreadyScannedToday = await hasBeenScannedToday(token);
    if (alreadyScannedToday) {
      return {
        valid: false,
        result: 'already_used',
        message: `Already scanned today: ${pass.participant_name}`,
        name: pass.participant_name
      };
    }

    // Check for previous usage (for standard passes)
    // VIPs can be used on multiple days, but regular passes are one-time only.
    if (pass.is_used && pass.pass_type !== 'vip') {
      return {
        valid: false,
        result: 'already_used',
        message: `Pass already used: ${pass.participant_name}`,
        name: pass.participant_name
      };
    }

    // Check if in pending queue (scanned offline but not synced yet)
    const pendingScan = await isInPendingQueue(token);
    if (pendingScan) {
      const scanTime = new Date(pendingScan.timestamp).toLocaleTimeString();
      return {
        valid: false,
        result: 'already_used',
        message: `Already scanned at ${scanTime}`,
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
        const { error } = await supabase
          .from('pass_scans')
          .insert({
            pass_token: scan.pass_token,
            participant_name: scan.participant_name,
            scan_result: scan.result,
            scanned_by_username: scan.security_username,
            guard_name: scan.guard_name,
            pass_type: scan.pass_type,
            scanned_at: scan.timestamp
          });

        if (error) {
          // Check if it's a duplicate (already scanned by another device)
          if (error.code === '23505' || error.message.includes('duplicate')) {
            console.log(`ℹ️ Scan already exists on server: ${scan.pass_token}`);
            await markScanAsSynced(scan.id!);
            synced++;
          } else {
            throw error;
          }
        } else {
          // Success - mark as synced
          await markScanAsSynced(scan.id!);
          synced++;
          console.log(`✅ Synced scan ${scan.id}: ${scan.participant_name}`);
        }
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
  // TRIM INPUT
  const token = rawToken.trim();

  // ONLINE - Try server validation first
  if (isOnline) {
    try {
      // 1. Fetch Pass Details (Read Only first)
      const { data: passData, error: fetchError } = await supabase
        .from('entry_passes')
        .select('*')
        .eq('pass_token', token)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!passData) {
        return {
          valid: false,
          result: 'invalid',
          message: 'Pass not found'
        };
      }

      // 2. Check Active Status
      if (!passData.is_active) {
         return {
          valid: false,
          result: 'inactive',
          message: 'Pass is inactive',
          name: passData.participant_name,
          pass_type: passData.pass_type
        };
      }

      // Check restricted date (Online Path)
      if (passData.valid_date) {
        // We can trust the client date for this quick check or parse server date if needed.
        // For consistency with offline mode, we check against local time (IST typically for physical event)
        const today = new Date();
        const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        
        if (passData.valid_date !== todayStr) {
          return {
             valid: false,
             result: 'invalid',
             message: `Valid for ${passData.valid_date} only`,
             name: passData.participant_name,
             pass_type: passData.pass_type
          };
        }
      }

      // 3. Evaluate Validation Rules (Before Consumption)
      const storedRules = await getStoredRules();
      const activeRules = storedRules; // Default removed
      
      const rulesResult = await evaluateRules(
        { pass_type: passData.pass_type, pass_token: token },
        activeRules
      );
      
      if (!rulesResult.valid) {
        return {
          valid: false,
          result: 'rule_violation',
          message: rulesResult.reason || 'Rule validation failed',
          name: passData.participant_name || 'Unknown',
          pass_type: passData.pass_type
        };
      }

      // 4. Everything Valid -> CONSUME (Call RPC to mark used)
      const { data, error } = await supabase
        .rpc('process_pass_scan_v3', { 
          p_pass_token: token,
          p_guard_name: guardName
        });

      if (error) throw error;

      if (data.success) {
        // Double check rules didn't change in split second (unlikely but safe)
        // ... (Skipping for perf, assumed safe via step 3)

        // Sync rules from server to keep cache fresh
        // Don't await to avoid UI delay
        syncRulesFromServer().catch(console.error);

        return {
          valid: true,
          result: 'valid',
          message: 'Valid entry',
          name: data.participant_name,
          pass_type: data.pass_type,
          scanned_by: securityUsername
        };
      } else {
        // Logic shouldn't reach here if Pre-Check passed, unless race condition or RPC specific logic
        return {
            valid: false,
            result: data.message === 'Pass already used' ? 'already_used' : 'invalid',
            message: data.message,
            name: data.participant_name,
            pass_type: data.pass_type
        };
      }
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
};


/**
 * Sync validation rules from server
 */
export async function syncRulesFromServer(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('validation_rules')
      .select('*')
      .eq('is_active', true);
      
    if (error) {
      console.warn('⚠️ Failed to fetch rules:', error.message);
      return;
    }
    
    if (data) {
      await storeRules(data);
    }
  } catch (err) {
    console.error('Failed to sync rules', err);
  }
}
