import { supabase } from './supabase';

export interface SecurityStats {
  totalScans: number;
  blockedAttempts: number;
  threatLevel: 'low' | 'moderate' | 'high';
  activeNodes: number;
  lastAttackAt: string | null;
}

export const getSecurityStats = async (): Promise<SecurityStats> => {
  try {
    // Fetch recent scans to estimate blocked attempts
    const { data: scans, error: scanError } = await supabase
      .from('pass_scans')
      .select('scan_result, scanned_at')
      .order('scanned_at', { ascending: false })
      .limit(100);

    if (scanError) throw scanError;

    const totalScans = scans?.length || 0;
    const blockedAttempts = scans?.filter(s => s.scan_result === 'invalid' || s.scan_result === 'inactive').length || 0;
    
    // Calculate threat level based on blocked attempts in last hour
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentBlocked = scans?.filter(s => 
      (s.scan_result === 'invalid' || s.scan_result === 'inactive') && 
      new Date(s.scanned_at) > oneHourAgo
    ).length || 0;

    let threatLevel: 'low' | 'moderate' | 'high' = 'low';
    if (recentBlocked > 10) threatLevel = 'high';
    else if (recentBlocked > 3) threatLevel = 'moderate';

    // Mock active nodes for UI feel
    const activeNodes = 4; // R2, Supabase DB, Supabase Auth, Netlify Functions

    return {
      totalScans,
      blockedAttempts,
      threatLevel,
      activeNodes,
      lastAttackAt: scans?.find(s => s.scan_result === 'invalid')?.scanned_at || null
    };
  } catch (error) {
    console.error('Error fetching security stats:', error);
    return {
      totalScans: 0,
      blockedAttempts: 0,
      threatLevel: 'low',
      activeNodes: 0,
      lastAttackAt: null
    };
  }
};

export const togglePanicLockdown = async (enabled: boolean) => {
  // In a real app, this would update a 'system_settings' table or similar
  // For now, we'll use a specific key in security_settings if it exists
  try {
    const { error } = await supabase
      .from('security_settings')
      .update({ panic_mode: enabled } as any)
      .eq('id', 1); // Assuming a single settings row
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error toggling panic mode:', error);
    return false;
  }
};
