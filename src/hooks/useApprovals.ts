import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { dualInsert, dualUpdate, dualDelete, dualUpsert, dualRead } from '../lib/dualDb';

export interface PendingApproval {
  id: string; // Changed to string for Firestore ID
  admin_user_id: string;
  entity_type: string;
  entity_id: number | null;
  action_type: 'create' | 'update' | 'delete';
  changes: any;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  admin_name?: string;
  admin_email?: string;
}

export const useApprovals = ({ listen = true }: { listen?: boolean } = {}) => {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time subscription to pending approvals
  useEffect(() => {
    if (!listen || !user?.id) { setLoading(false); return; }

    setLoading(true);

    const subscription = supabase
      .channel('public:pending_approvals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_approvals',
          filter: 'status=eq.pending'
        },
        async () => {
          // Re-fetch on any change for consistency
          const { data, error } = await supabase
            .from('pending_approvals')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('❌ Error fetching pending_approvals:', error);
            setError(error.message);
          } else {
            setPendingApprovals(data as PendingApproval[]);
          }
          setLoading(false);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Initial fetch
          supabase
            .from('pending_approvals')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
              if (error) {
                console.error('❌ Error in initial fetch:', error);
                setError(error.message);
              } else {
                setPendingApprovals(data as PendingApproval[]);
              }
              setLoading(false);
            });
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id, listen]);

  // Refetch wrapper for API compatibility, though Supabase Realtime automatically handles it
  const fetchPendingApprovals = async () => {};

  // Submit new change for approval
  const submitForApproval = async (
    entityType: string,
    actionType: 'create' | 'update' | 'delete',
    changes: any,
    entityId?: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔵 submitForApproval called:', { entityType, actionType, entityId, user: user?.id });
      
      if (!user?.id) {
        console.error('❌ No user ID found');
        return { success: false, error: 'User not authenticated' };
      }

      const newId = Date.now().toString();
      const approvalData = {
        id: newId,
        admin_user_id: user.id,
        entity_type: entityType,
        entity_id: entityId || null,
        action_type: actionType,
        changes: changes,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('🔵 Inserting approval data:', approvalData);

      await dualUpsert('pending_approvals', approvalData);

      console.log('✅ Approval inserted successfully:', approvalData);
      return { success: true };
    } catch (err: any) {
      console.error('❌ Exception in submitForApproval:', err);
      return { success: false, error: err.message };
    }
  };

  // Approve a pending change
  const approveChange = async (approvalId: string, modifiedChanges?: any) => {
    try {
      const approval = pendingApprovals.find(a => a.id === approvalId);
      if (!approval) throw new Error('Approval not found');

      // Apply the reviewed values before recording a successful approval.
      await applyApprovedChange({ ...approval, changes: modifiedChanges ?? approval.changes });

      // Mark as approved after the change succeeds
      await dualUpdate('pending_approvals', approvalId, {
        status: 'approved',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      });


      return { success: true };
    } catch (err: any) {
      console.error('Error approving change:', err);
      return { success: false, error: err.message };
    }
  };

  // Reject a pending change
  const rejectChange = async (approvalId: string, reason?: string) => {
    try {
      await dualUpdate('pending_approvals', approvalId, {
        status: 'rejected',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason || null
      });

      return { success: true };
    } catch (err: any) {
      console.error('Error rejecting change:', err);
      return { success: false, error: err.message };
    }
  };

  // Apply approved change to actual table via dualDb
  const applyApprovedChange = async (approval: PendingApproval) => {
    const { entity_type, action_type, changes, entity_id } = approval;
    const table = entity_type === 'gallery_image' ? 'gallery_images' : entity_type === 'gallery_settings' ? 'gallery_settings' : `${entity_type}s`;

    try {
      if (entity_type === 'event' && action_type !== 'delete' && Array.isArray(changes?.coordinators)) {
        const { coordinators, ...eventChanges } = changes;
        let eventId = entity_id;
        if (action_type === 'create') {
          const inserted = await dualInsert('events', eventChanges);
          eventId = (Array.isArray(inserted) ? inserted[0] : inserted)?.id;
          if (eventId == null) throw new Error('The created event could not be confirmed.');
        } else {
          if (eventId == null) throw new Error('The event to update is missing.');
          await dualUpdate('events', eventId, eventChanges);
        }
        const { data: existing = [] } = await dualRead({ table: 'event_coordinators', eq: ['event_id', eventId], forceRefresh: true });
        const desired = coordinators.filter((coord: any) => coord && typeof coord.name === 'string' && coord.name.trim());
        for (const row of existing || []) if (!desired.some((coord: any) => coord.id === row.id)) await dualDelete('event_coordinators', row.id);
        for (const [index, coord] of desired.entries()) {
          const payload = { event_id: eventId, name: coord.name.trim(), phone: coord.phone || null, order_position: index + 1 };
          if (coord.id != null && (existing || []).some((row: any) => row.id === coord.id)) await dualUpdate('event_coordinators', coord.id, payload);
          else await dualInsert('event_coordinators', payload);
        }
        return;
      }
      if (action_type === 'create') {
        await dualInsert(table, changes);
      } else if (action_type === 'update' && entity_id) {
        await dualUpdate(table, String(entity_id), changes);
      } else if (action_type === 'delete' && entity_id) {
        await dualDelete(table, String(entity_id));
      }
    } catch (err: any) {
      console.error('Error applying approved change:', err);
      throw err;
    }
  };

  // Check if current user requires approval
  const checkRequiresApproval = async (): Promise<boolean> => {
    return false;
  };

  return {
    pendingApprovals,
    loading,
    error,
    submitForApproval,
    approveChange,
    rejectChange,
    checkRequiresApproval,
    refetch: fetchPendingApprovals
  };
};
