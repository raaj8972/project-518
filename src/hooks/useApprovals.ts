import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { dualInsert, dualUpdate, dualDelete } from '../lib/dualDb';

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

    const q = query(
      collection(db, 'pending_approvals'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const approvals: PendingApproval[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as PendingApproval[];
      
      // Sort in memory by created_at desc
      approvals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setPendingApprovals(approvals);
      setLoading(false);
    }, (err) => {
      console.error('❌ Exception listening to pending_approvals:', err);
      setError(err.message);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  // Refetch wrapper for API compatibility, though onSnapshot automatically handles it
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

      const docRef = doc(db, 'pending_approvals', newId);
      await setDoc(docRef, approvalData);

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

      const docRef = doc(db, 'pending_approvals', approvalId);

      // If modified changes are provided, update the pending approval record first
      if (modifiedChanges) {
        await updateDoc(docRef, { changes: modifiedChanges });
        approval.changes = modifiedChanges;
      }

      // First, mark as approved
      await updateDoc(docRef, {
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
      const docRef = doc(db, 'pending_approvals', approvalId);

      await updateDoc(docRef, {
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
