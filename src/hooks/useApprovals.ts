import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface PendingApproval {
  id: number;
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

  // Fetch pending approvals
  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      console.log('🔵 fetchPendingApprovals: Starting fetch...');
      console.log('🔵 Current user:', user?.id, user?.email);

      const { data, error } = await supabase
        .from('pending_approvals')
        .select('*, admin_users(email)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      console.log('🔵 Query completed. Error:', error);
      console.log('🔵 Data received:', data);
      console.log('🔵 Number of rows:', data?.length || 0);

      if (error) {
        console.error('❌ Supabase error fetching approvals:', error);
        throw error;
      }

      const approvals: PendingApproval[] = (data || []).map((item: any) => ({
        id: item.id,
        admin_user_id: item.admin_user_id,
        admin_email: item.admin_users?.email || 'Unknown',
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        action_type: item.action_type,
        changes: item.changes,
        status: item.status,
        created_at: item.created_at,
      }));

      console.log('✅ Mapped approvals:', approvals);
      setPendingApprovals(approvals);
    } catch (err) {
      console.error('❌ Exception in fetchPendingApprovals:', err);
    } finally {
      setLoading(false);
    }
  };

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

      const approvalData = {
        admin_user_id: user.id,
        entity_type: entityType,
        entity_id: entityId || null,
        action_type: actionType,
        changes: changes,
        status: 'pending'
      };
      
      console.log('🔵 Inserting approval data:', approvalData);

      const { data, error } = await supabase
        .from('pending_approvals')
        .insert([approvalData])
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Approval inserted successfully:', data);
      return { success: true };
    } catch (err: any) {
      console.error('❌ Exception in submitForApproval:', err);
      return { success: false, error: err.message };
    }
  };

  // Approve a pending change
  const approveChange = async (approvalId: number, modifiedChanges?: any) => {
    try {
      const approval = pendingApprovals.find(a => a.id === approvalId);
      if (!approval) throw new Error('Approval not found');

      // If modified changes are provided, update the pending approval record first
      if (modifiedChanges) {
        const { error: updateError } = await supabase
          .from('pending_approvals')
          .update({ changes: modifiedChanges })
          .eq('id', approvalId);
        
        if (updateError) throw updateError;
        
        // Update local approval object for the next step
        approval.changes = modifiedChanges;
      }

      // First, mark as approved
      const { error: updateError } = await supabase
        .from('pending_approvals')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', approvalId);

      if (updateError) throw updateError;

      // Then, apply the actual change to the appropriate table
      await applyApprovedChange(approval);

      // Refresh the list
      await fetchPendingApprovals();

      return { success: true };
    } catch (err: any) {
      console.error('Error approving change:', err);
      return { success: false, error: err.message };
    }
  };

  // Reject a pending change
  const rejectChange = async (approvalId: number, reason?: string) => {
    try {
      const { error } = await supabase
        .from('pending_approvals')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason || null
        })
        .eq('id', approvalId);

      if (error) throw error;

      // Refresh the list
      await fetchPendingApprovals();

      return { success: true };
    } catch (err: any) {
      console.error('Error rejecting change:', err);
      return { success: false, error: err.message };
    }
  };

  // Apply approved change to actual table
  const applyApprovedChange = async (approval: PendingApproval) => {
    const { entity_type, action_type, changes, entity_id } = approval;

    try {
      if (action_type === 'create') {
        // Insert new record
        const { error } = await supabase
          .from(entity_type === 'gallery_image' ? 'gallery_images' : `${entity_type}s`)
          .insert(changes);
        
        if (error) throw error;
      } else if (action_type === 'update' && entity_id) {
        // Update existing record
        const { error } = await supabase
          .from(entity_type === 'gallery_image' ? 'gallery_images' : `${entity_type}s`)
          .update(changes)
          .eq('id', entity_id);
        
        if (error) throw error;
      } else if (action_type === 'delete' && entity_id) {
        // Delete record
        const { error } = await supabase
          .from(entity_type === 'gallery_image' ? 'gallery_images' : `${entity_type}s`)
          .delete()
          .eq('id', entity_id);
        
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Error applying approved change:', err);
      throw err;
    }
  };

  // Check if current user requires approval
  const checkRequiresApproval = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('requires_approval')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      return data?.requires_approval || false;
    } catch (err) {
      console.error('Error checking approval requirement:', err);
      return false;
    }
  };

  // Fetch on mount
  useEffect(() => {
    if (user) {
      fetchPendingApprovals();
    }
  }, [user]);

  // Real-time subscription to pending approvals
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('pending_approvals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_approvals'
        },
        () => {
          fetchPendingApprovals();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

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
