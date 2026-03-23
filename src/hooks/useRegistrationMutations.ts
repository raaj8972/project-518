import { useState, useCallback } from 'react';
import { dualUpdate, dualDelete, dualRead, dualInsert } from '../lib/dualDb';
import { useToast } from '../components/ToastProvider';


export function useRegistrationMutations(onSuccess?: () => void) {
  const { push } = useToast();

  const [isMutating, setIsMutating] = useState(false);

  const handleError = (error: any, action: string) => {
    console.error(`Error during ${action}:`, error);
    push({ type: 'error', message: `Failed to ${action}: ${error.message || 'Unknown error'}` });
    setIsMutating(false);
  };

  const updateStatus = useCallback(async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    setIsMutating(true);
    try {
      await dualUpdate('registrations', id, { status });

      // Search for entry pass linked to this registration
      // Note: We'd ideally have entry_pass_id stored, but for now we search
      const { data: passes } = await dualRead({
        table: 'entry_passes',
        eq: ['registration_id', id]
      });

      if (passes && passes.length > 0) {
        for (const pass of passes) {
          await dualUpdate('entry_passes', pass.id, { is_active: status === 'approved' });
        }
      }

      push({ type: 'success', message: `Registration ${status}` });
      onSuccess?.();
    } catch (e) { handleError(e, 'update status'); }
    finally { setIsMutating(false); }
  }, [onSuccess, push]);

  const deleteRegistration = useCallback(async (id: string) => {
    setIsMutating(true);
    try {
      const timestamp = new Date().toISOString();
      await dualUpdate('registrations', id, { deleted_at: timestamp });

      // Deactivate passes
      const { data: passes } = await dualRead({
        table: 'entry_passes',
        eq: ['registration_id', id]
      });

      if (passes) {
        for (const pass of passes) {
          await dualUpdate('entry_passes', pass.id, { is_active: false });
        }
      }
      
      push({ type: 'success', message: 'Registration moved to trash' });
      onSuccess?.();
    } catch (e) { handleError(e, 'delete registration'); }
    finally { setIsMutating(false); }
  }, [onSuccess, push]);

  const restoreRegistration = useCallback(async (id: string) => {
    setIsMutating(true);
    try {
      await dualUpdate('registrations', id, { deleted_at: null });
      
      const { data: passes } = await dualRead({
        table: 'entry_passes',
        eq: ['registration_id', id]
      });

      if (passes) {
        for (const pass of passes) {
          await dualUpdate('entry_passes', pass.id, { is_active: true });
        }
      }

      push({ type: 'success', message: 'Registration restored' });
      onSuccess?.();
    } catch (e) { handleError(e, 'restore registration'); }
    finally { setIsMutating(false); }
  }, [onSuccess, push]);

  const permanentDelete = useCallback(async (id: string) => {
    setIsMutating(true);
    try {
      await dualDelete('registrations', id);
      push({ type: 'success', message: 'Registration permanently deleted' });
      onSuccess?.();
    } catch (e) { handleError(e, 'permanently delete'); }
    finally { setIsMutating(false); }
  }, [onSuccess, push]);

  const bulkApprove = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setIsMutating(true);
    try {
      for (const id of ids) {
        await updateStatus(id, 'approved');
      }
      push({ type: 'success', message: `Approved ${ids.length} registrations` });
      onSuccess?.();
    } catch (e) { handleError(e, 'bulk approve'); }
    finally { setIsMutating(false); }
  }, [updateStatus, push, onSuccess]);

  const bulkReject = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setIsMutating(true);
    try {
      for (const id of ids) {
        await updateStatus(id, 'rejected');
      }
      push({ type: 'success', message: `Rejected ${ids.length} registrations` });
      onSuccess?.();
    } catch (e) { handleError(e, 'bulk reject'); }
    finally { setIsMutating(false); }
  }, [updateStatus, push, onSuccess]);

  const bulkDelete = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setIsMutating(true);
    try {
      for (const id of ids) {
        await deleteRegistration(id);
      }
      push({ type: 'success', message: `Moved ${ids.length} registrations to trash` });
      onSuccess?.();
    } catch (e) { handleError(e, 'bulk delete'); }
    finally { setIsMutating(false); }
  }, [deleteRegistration, push, onSuccess]);

  const bulkRestore = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setIsMutating(true);
    try {
      for (const id of ids) {
        await restoreRegistration(id);
      }
      push({ type: 'success', message: `Restored ${ids.length} registrations` });
      onSuccess?.();
    } catch (e) { handleError(e, 'bulk restore'); }
    finally { setIsMutating(false); }
  }, [restoreRegistration, push, onSuccess]);

  const bulkPermanentDelete = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setIsMutating(true);
    try {
      for (const id of ids) {
        await permanentDelete(id);
      }
      push({ type: 'success', message: `Permanently deleted ${ids.length} registrations` });
      onSuccess?.();
    } catch (e) { handleError(e, 'bulk permanent delete'); }
    finally { setIsMutating(false); }
  }, [permanentDelete, push, onSuccess]);

  const bulkGeneratePasses = useCallback(async (ids: string[], onProgress?: (pct: number, item: string) => void) => {
    if (!ids.length) return;
    setIsMutating(true);
    try {
      let successCount = 0;
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const progress = (i / ids.length) * 100;
        
        // 1. Fetch registration
        const { data: regData } = await dualRead({
          table: 'registrations',
          eq: ['id', id]
        });
        const registration = regData?.[0];
        if (!registration) continue;

        onProgress?.(progress, `Generating passes for ${registration.full_name}...`);

        // 2. Fetch event for date calculation
        // Try to get cached event from useData if possible, but here we are in a hook.
        // We'll just read it for now.
        const { data: eventData } = await dualRead({
          table: 'events',
          eq: ['id', registration.event_id]
        });
        const event = eventData?.[0];
        
        // Base date logic
        let baseDateStr = event?.date || new Date().toISOString().split('T')[0];
        let baseDate = new Date(baseDateStr);
        if (isNaN(baseDate.getTime())) {
            baseDate = new Date();
        }

        // 3. Generate 3 passes
        for (let day = 1; day <= 3; day++) {
          const passToken = `PASS-${id.substring(0, 6)}-D${day}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          
          // Calculate valid_date (Day 1 = base, Day 2 = base+1, Day 3 = base+2)
          const validDate = new Date(baseDate);
          validDate.setDate(baseDate.getDate() + (day - 1));
          const validDateStr = validDate.toISOString().split('T')[0];

          try {
            await dualInsert('entry_passes', {
              registration_id: id,
              day_number: day,
              valid_date: validDateStr,
              pass_token: passToken,
              participant_name: registration.full_name,
              is_active: registration.status === 'approved',
              is_used: false
            });
          } catch (insertErr: any) {
            if (insertErr.message?.includes('unique_registration_day_v3')) {
                console.log(`Pass for registration ${id} day ${day} already exists.`);
            } else {
                console.warn('Insert error:', insertErr);
            }
          }
        }
        successCount++;
      }
      onProgress?.(100, 'All passes generated!');
      push({ type: 'success', message: `Generated 3-day passes for ${successCount} registrations` });
      onSuccess?.();
    } catch (e) { handleError(e, 'bulk generate passes'); }
    finally { setIsMutating(false); }
  }, [push, onSuccess]);

  const updateBatchGlobally = useCallback(async (email: string, newBatch: string) => {
    setIsMutating(true);
    try {
      // 1. Find all registrations for this email
      const { data: userRegs } = await dualRead({
        table: 'registrations',
        eq: ['email', email]
      });
      
      if (userRegs && userRegs.length > 0) {
        for (const reg of userRegs) {
          if (reg.participant_type !== newBatch) {
            await dualUpdate('registrations', reg.id, { participant_type: newBatch });
          }
        }
      }

      // 2. Find all auditions for this email
      const { data: userAuditions } = await dualRead({
        table: 'auditions',
        eq: ['email', email]
      });

      if (userAuditions && userAuditions.length > 0) {
        for (const aud of userAuditions) {
          if (aud.participant_type !== newBatch) {
            await dualUpdate('auditions', aud.id, { participant_type: newBatch });
          }
        }
      }

      // 3. Find all memberships for this email
      const { data: userMemberships } = await dualRead({
        table: 'memberships',
        eq: ['email', email]
      });

      if (userMemberships && userMemberships.length > 0) {
        for (const mem of userMemberships) {
          if (mem.participant_type !== newBatch) {
            await dualUpdate('memberships', mem.id, { participant_type: newBatch });
          }
        }
      }

      // 4. Find and update profiles (field name is 'batch')
      const { data: userProfiles } = await dualRead({
        table: 'profiles',
        eq: ['email', email]
      });

      if (userProfiles && userProfiles.length > 0) {
        for (const prof of userProfiles) {
          if (prof.batch !== newBatch) {
            await dualUpdate('profiles', prof.id, { batch: newBatch });
          }
        }
      }

      // 5. Find and update annual sports registrations
      const { data: annualSports } = await dualRead({
        table: 'annual_sports_registrations',
        eq: ['email', email]
      });

      if (annualSports && annualSports.length > 0) {
        for (const asr of annualSports) {
          if (asr.participant_type !== newBatch) {
            await dualUpdate('annual_sports_registrations', asr.id, { participant_type: newBatch });
          }
        }
      }

      // 6. Find and update seasonal sports registrations
      const { data: seasonalSports } = await dualRead({
        table: 'sports_registrations',
        eq: ['email', email]
      });

      if (seasonalSports && seasonalSports.length > 0) {
        for (const ssr of seasonalSports) {
          if (ssr.participant_type !== newBatch) {
            await dualUpdate('sports_registrations', ssr.id, { participant_type: newBatch });
          }
        }
      }

      push({ type: 'success', message: `Batch globally updated to ${newBatch} for ${email}` });
      onSuccess?.();
    } catch (e) { handleError(e, 'global batch update'); }
    finally { setIsMutating(false); }
  }, [push, onSuccess]);

  return {
    isMutating,
    updateStatus,
    deleteRegistration,
    restoreRegistration,
    permanentDelete,
    bulkApprove,
    bulkReject,
    bulkDelete,
    bulkRestore,
    bulkPermanentDelete,
    bulkGeneratePasses,
    updateBatchGlobally
  };
};
