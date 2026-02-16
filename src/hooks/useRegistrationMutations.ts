import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { encryptData } from '../utils/encryption';
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
      const { error } = await supabase.from('registrations').update({ status }).eq('id', id);
      if (error) throw error;

      await supabase.from('entry_passes')
        .update({ is_active: status === 'approved' })
        .eq('event_registration_id', id);

      push({ type: 'success', message: `Registration ${status}` });
      onSuccess?.();
    } catch (e) { handleError(e, 'update status'); }
    finally { setIsMutating(false); }
  }, [onSuccess, push]);

  const deleteRegistration = useCallback(async (id: string) => {
    setIsMutating(true);
    try {
      const timestamp = new Date().toISOString();
      const { error } = await supabase.from('registrations').update({ deleted_at: timestamp }).eq('id', id);
      if (error) throw error;

      await supabase.from('entry_passes').update({ is_active: false }).eq('event_registration_id', id);
      
      push({ type: 'success', message: 'Registration moved to trash' });
      onSuccess?.();
    } catch (e) { handleError(e, 'delete registration'); }
    finally { setIsMutating(false); }
  }, [onSuccess, push]);

  const restoreRegistration = useCallback(async (id: string) => {
    setIsMutating(true);
    try {
      const { error } = await supabase.from('registrations').update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
      
      await supabase.from('entry_passes').update({ is_active: true }).eq('event_registration_id', id);

      push({ type: 'success', message: 'Registration restored' });
      onSuccess?.();
    } catch (e) { handleError(e, 'restore registration'); }
    finally { setIsMutating(false); }
  }, [onSuccess, push]);

  const permanentDelete = useCallback(async (id: string) => {
    setIsMutating(true);
    try {
      const { error } = await supabase.from('registrations').delete().eq('id', id);
      if (error) throw error;
      push({ type: 'success', message: 'Registration permanently deleted' });
      onSuccess?.();
    } catch (e) { handleError(e, 'permanently delete'); }
    finally { setIsMutating(false); }
  }, [onSuccess, push]);

  const bulkApprove = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setIsMutating(true);
    try {
      const CHUNK = 100;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const { error } = await supabase.from('registrations').update({ status: 'approved' }).in('id', slice);
        if (error) throw error;
        await supabase.from('entry_passes').update({ is_active: true }).in('event_registration_id', slice);
      }
      push({ type: 'success', message: `Approved ${ids.length} registrations` });
      onSuccess?.();
    } catch (e) { handleError(e, 'bulk approve'); }
    finally { setIsMutating(false); }
  }, [onSuccess, push]);

  const bulkReject = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setIsMutating(true);
    try {
      const CHUNK = 100;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const { error } = await supabase.from('registrations').update({ status: 'rejected' }).in('id', slice);
        if (error) throw error;
        await supabase.from('entry_passes').update({ is_active: false }).in('event_registration_id', slice);
      }
      push({ type: 'success', message: `Rejected ${ids.length} registrations` });
      onSuccess?.();
    } catch (e) { handleError(e, 'bulk reject'); }
    finally { setIsMutating(false); }
  }, [onSuccess, push]);

  const bulkDelete = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setIsMutating(true);
    try {
      const now = new Date().toISOString();
      const CHUNK = 100;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const { error } = await supabase.from('registrations').update({ deleted_at: now }).in('id', slice);
        if (error) throw error;
        await supabase.from('entry_passes').update({ is_active: false }).in('event_registration_id', slice);
      }
      push({ type: 'success', message: `Moved ${ids.length} registrations to trash` });
      onSuccess?.();
    } catch (e) { handleError(e, 'bulk delete'); }
    finally { setIsMutating(false); }
  }, [onSuccess, push]);

  const bulkRestore = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setIsMutating(true);
    try {
      const CHUNK = 100;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const { error } = await supabase.from('registrations').update({ deleted_at: null }).in('id', slice);
        if (error) throw error;
        await supabase.from('entry_passes').update({ is_active: true }).in('event_registration_id', slice);
      }
      push({ type: 'success', message: `Restored ${ids.length} registrations` });
      onSuccess?.();
    } catch (e) { handleError(e, 'bulk restore'); }
    finally { setIsMutating(false); }
  }, [onSuccess, push]);

  const bulkPermanentDelete = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setIsMutating(true);
    try {
      const CHUNK = 100;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const { error } = await supabase.from('registrations').delete().in('id', slice);
        if (error) throw error;
      }
      push({ type: 'success', message: `Permanently deleted ${ids.length} registrations` });
      onSuccess?.();
    } catch (e) { handleError(e, 'bulk permanent delete'); }
    finally { setIsMutating(false); }
  }, [onSuccess, push]);

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
    bulkPermanentDelete
  };
}
