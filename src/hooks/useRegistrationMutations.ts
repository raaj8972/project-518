import { useState, useCallback } from 'react';
import { dualUpdate, dualDelete, dualUpsert, dualRead } from '../lib/dualDb';
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
        eq: ['event_registration_id', id]
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
        eq: ['event_registration_id', id]
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
        eq: ['event_registration_id', id]
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
