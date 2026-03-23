import { supabase } from '../lib/supabase';
import { dualInsert } from '../lib/dualDb';

export interface PassGenerationProgress {
  percentage: number;
  message: string;
}

export const passService = {
  /**
   * Generates a 3-day pass for a specific user.
   */
  async generatePassForUser(userId: string, profile: any, onProgress?: (pct: number, msg: string) => void) {
    // 1. Fetch pass configuration from security_settings
    const { data: settings } = await supabase
      .from('security_settings')
      .select('event_dates, venue')
      .single();

    const eventDates = settings?.event_dates || ['2024-03-20', '2024-03-21', '2024-03-22'];
    const venue = settings?.venue || 'Main Arena';

    onProgress?.(10, `Preparing passes for ${profile?.full_name || userId}...`);

    for (let day = 1; day <= 3; day++) {
      const passToken = `PASS-${userId.substring(0, 6)}-D${day}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Use the configured date for the specific day (fallback to baseDate logic if array is too short)
      const validDateStr = eventDates[day - 1] || eventDates[0];

      try {
        await dualInsert('entry_passes', {
          user_id: userId,
          day_number: day,
          valid_date: validDateStr,
          venue: venue,
          pass_token: passToken,
          participant_name: profile?.full_name || 'Participant',
          pass_type: 'General Admission',
          is_active: true, // Auto-active for approved users
          is_used: false
        });
      } catch (err: any) {
        if (err.message?.includes('entry_passes_user_day_unique') || err.message?.includes('duplicate key value')) {
          console.log(`Pass for user ${userId} day ${day} already exists.`);
        } else {
          throw err;
        }
      }
      onProgress?.(10 + (day * 30), `Generated Day ${day} pass...`);
    }
    
    return { success: true };
  },

  /**
   * Generates passes for all approved users who don't have them yet.
   */
  async generatePassesForAllUsers(batch?: string, onProgress?: (progress: PassGenerationProgress) => void) {
    try {
      // 1. Fetch all approved profiles, optionally filtered by batch
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_approved', true);

      if (batch && batch !== 'all') {
        query = query.eq('batch', batch);
      }

      const { data: profiles, error: profileErr } = await query;

      if (profileErr) throw profileErr;
      if (!profiles || profiles.length === 0) {
        return { success: true, count: 0 };
      }

      let successCount = 0;
      for (let i = 0; i < profiles.length; i++) {
        const profile = profiles[i];
        const pct = Math.floor((i / profiles.length) * 100);
        
        onProgress?.({ 
          percentage: pct, 
          message: `Processing ${profile.full_name || profile.id}...` 
        });

        await this.generatePassForUser(profile.id, profile);
        successCount++;
      }

      onProgress?.({ percentage: 100, message: 'Completed!' });
      return { success: true, count: successCount };
    } catch (err: any) {
      console.error('Pass generation failed:', err);
      throw err;
    }
  },

  /**
   * Revokes a specific pass for a user on a specific day.
   */
  async revokePass(userId: string, dayNumber: number) {
    const { error } = await supabase
      .from('entry_passes')
      .delete()
      .match({ user_id: userId, day_number: dayNumber });

    if (error) throw error;
    return { success: true };
  },

  /**
   * Bulk revokes all passes for students in a specific batch.
   */
  async revokePassesByBatch(batch: string) {
    if (!batch || batch === 'all') {
      throw new Error('Please select a specific batch to revoke passes.');
    }

    // 1. Get all user IDs in this batch
    const { data: users, error: userErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('batch', batch);

    if (userErr) throw userErr;
    if (!users || users.length === 0) return { success: true, count: 0 };

    const userIds = users.map(u => u.id);

    // 2. Delete all passes for these users
    const { error: deleteErr } = await supabase
      .from('entry_passes')
      .delete()
      .in('user_id', userIds);

    if (deleteErr) throw deleteErr;

    return { success: true, count: userIds.length };
  }
};
