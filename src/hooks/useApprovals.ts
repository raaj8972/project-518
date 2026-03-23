import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { dualInsert, dualUpdate, dualDelete, dualUpsert } from '../lib/dualDb';

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

export const useApprovals = () => {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time subscription to pending approvals
  useEffect(() => {
    if (!user?.id) return;

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
  }, [user?.id]);

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

      // First, mark as approved
      await dualUpdate('pending_approvals', approvalId, {
        status: 'approved',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      });

      // Then, apply the actual change to the appropriate table
      await applyApprovedChange(approval);

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
    const table = entity_type === 'gallery_image' ? 'gallery_images' : `${entity_type}s`;

    try {
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
