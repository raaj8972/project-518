import React, { useState, useEffect, useMemo, useCallback, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Inbox,
  Loader2,
  LogOut,
  Phone,
  RefreshCw,
  Search,
  UserCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { BrandMark } from '../components/BrandMark';
import '../styles/CRPortal.css';

export const CRDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<{ batch: string } | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const searchInputId = useId();

  // Authenticate CR session
  useEffect(() => {
    const stored = sessionStorage.getItem('cr_session');
    if (!stored) {
      navigate('/cr/login');
      return;
    }
    try {
      const data = JSON.parse(stored);
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        sessionStorage.removeItem('cr_session');
        toast.error('Session expired. Please login again.');
        navigate('/cr/login');
        return;
      }
      void supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
        if (
          !activeSession ||
          activeSession.user.app_metadata?.role !== 'cr' ||
          activeSession.user.app_metadata.cr_batch !== data.batch
        ) {
          sessionStorage.removeItem('cr_session');
          navigate('/cr/login');
          return;
        }
        setSession(data);
      });
    } catch {
      navigate('/cr/login');
    }
  }, [navigate]);

  // Fetch profiles matching CR's batch
  const fetchProfiles = useCallback(async () => {
    if (!session?.batch) return;
    setLoading(true);
    try {
      const allProfiles: any[] = [];
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, phone, college, batch, is_approved, avatar_url, created_at')
          .eq('batch', session.batch)
          .order('full_name', { ascending: true })
          .order('id', { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        allProfiles.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }
      setProfiles(allProfiles);
    } catch (err: unknown) {
      toast.error('Error fetching student profiles: ' + (err instanceof Error ? err.message : 'Try again.'));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.batch) void fetchProfiles();
  }, [session, fetchProfiles]);

  // Single profile approval / revoke
  const handleToggleApproval = async (profileId: string, currentStatus: boolean) => {
    setApprovingId(profileId);
    try {
      const { error } = await supabase.rpc('approve_student_profile', {
        p_student_id: profileId,
        p_batch: session?.batch || '',
        p_password: '',
        p_is_approved: !currentStatus,
      });
      if (error) throw error;
      toast.success(currentStatus ? 'Approval revoked.' : 'Student profile approved.');
      setProfiles(prev => prev.map(p => (p.id === profileId ? { ...p, is_approved: !currentStatus } : p)));
    } catch (err: unknown) {
      toast.error('Failed to update approval status: ' + (err instanceof Error ? err.message : 'Try again.'));
    } finally {
      setApprovingId(null);
    }
  };

  // Bulk approve filtered pending profiles
  const handleBulkApprove = async (filteredPendingIds: string[]) => {
    if (!filteredPendingIds.length) return;
    setBulkApproving(true);
    try {
      const { error } = await supabase.rpc('cr_approve_batch_profiles', {
        p_student_ids: filteredPendingIds,
        p_is_approved: true,
      });
      if (error) throw error;
      toast.success(`Approved ${filteredPendingIds.length} student profiles.`);
      setConfirmBulkOpen(false);
      setProfiles(prev => prev.map(p => (filteredPendingIds.includes(p.id) ? { ...p, is_approved: true } : p)));
    } catch (err: unknown) {
      toast.error('Bulk approval failed: ' + (err instanceof Error ? err.message : 'Try again.'));
    } finally {
      setBulkApproving(false);
    }
  };

  const handleSignOut = () => {
    sessionStorage.removeItem('cr_session');
    toast.success('Signed out.');
    void supabase.auth.signOut().finally(() => navigate('/cr/login'));
  };

  const filteredProfiles = useMemo(() => {
    const isApprovedTarget = activeTab === 'approved';
    const base = profiles.filter(p => Boolean(p.is_approved) === isApprovedTarget);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      p =>
        p.full_name?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
    );
  }, [profiles, activeTab, searchQuery]);

  const pendingCount = useMemo(() => profiles.filter(p => !p.is_approved).length, [profiles]);
  const approvedCount = useMemo(() => profiles.filter(p => p.is_approved).length, [profiles]);

  return (
    <div className="cr-dashboard">
      <div className="cr-backdrop" aria-hidden="true" />

      <header className="cr-topbar">
        <div className="cr-topbar-inner">
          <div className="cr-brand">
            <BrandMark allowCachedWhileLoading width={36} height={36} alt="" />
            <div className="cr-brand-copy">
              <p className="cr-kicker">
                <span />
                {BRAND_NAME} {BRAND_YEAR} · CR Portal
              </p>
              <h1>{session?.batch ? `${session.batch} Verification Desk` : 'Batch Verification Desk'}</h1>
            </div>
          </div>

          <button type="button" onClick={handleSignOut} className="cr-signout-btn">
            <LogOut size={15} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      <main className="cr-main">
        <section className="cr-stats-grid" aria-label="Batch summary">
          <div className="cr-stat-card is-pending">
            <span>Pending review</span>
            <strong>{pendingCount}</strong>
          </div>
          <div className="cr-stat-card is-approved">
            <span>Verified &amp; approved</span>
            <strong>{approvedCount}</strong>
          </div>
          <div className="cr-stat-card">
            <span>Total batch students</span>
            <strong>{profiles.length}</strong>
          </div>
        </section>

        <section className="cr-toolbar" aria-label="Directory controls">
          <div className="cr-tabs" role="tablist" aria-label="Student approval status">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'pending'}
              className="cr-tab"
              onClick={() => {
                setActiveTab('pending');
                setConfirmBulkOpen(false);
              }}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'approved'}
              className="cr-tab"
              onClick={() => {
                setActiveTab('approved');
                setConfirmBulkOpen(false);
              }}
            >
              Approved ({approvedCount})
            </button>
          </div>

          <div className="cr-toolbar-actions">
            <button
              type="button"
              onClick={() => void fetchProfiles()}
              disabled={loading}
              className="cr-icon-btn"
            >
              <RefreshCw size={14} className={loading ? 'cr-spin' : ''} aria-hidden="true" />
              Refresh
            </button>
            {activeTab === 'pending' && filteredProfiles.length > 0 && !confirmBulkOpen && (
              <button
                type="button"
                onClick={() => setConfirmBulkOpen(true)}
                disabled={bulkApproving}
                className="cr-bulk-btn"
              >
                <UserCheck size={14} aria-hidden="true" />
                Approve all shown ({filteredProfiles.length})
              </button>
            )}
          </div>
        </section>

        {confirmBulkOpen && activeTab === 'pending' && filteredProfiles.length > 0 && (
          <div className="cr-confirm-bar" role="region" aria-label="Confirm bulk approval">
            <span>Approve all {filteredProfiles.length} pending student profiles currently shown?</span>
            <div className="cr-confirm-actions">
              <button
                type="button"
                className="cr-confirm-btn"
                disabled={bulkApproving}
                onClick={() => void handleBulkApprove(filteredProfiles.map(p => p.id))}
              >
                {bulkApproving ? 'Approving…' : 'Confirm approve all'}
              </button>
              <button
                type="button"
                className="cr-icon-btn"
                disabled={bulkApproving}
                onClick={() => setConfirmBulkOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="cr-search-box" role="search">
          <Search size={16} aria-hidden="true" />
          <label htmlFor={searchInputId} className="sr-only">
            Search {activeTab} students
          </label>
          <input
            id={searchInputId}
            type="search"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder={`Search ${activeTab} students by name, @username, or phone…`}
          />
        </div>

        {loading ? (
          <div className="cr-empty-card" role="status">
            <Loader2 size={28} className="cr-spin" aria-hidden="true" />
            <p>Loading student profiles…</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="cr-empty-card">
            <Inbox size={28} aria-hidden="true" />
            <p>No {activeTab} students match your view.</p>
            <small>Try switching tabs or clearing your search query.</small>
          </div>
        ) : (
          <div className="cr-list">
            {filteredProfiles.map((p, idx) => (
              <article key={p.id} className="cr-student-card">
                <div className="cr-student-main">
                  <span className="cr-serial">#{idx + 1}</span>
                  <div className="cr-avatar" aria-hidden="true">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" />
                    ) : (
                      (p.full_name?.charAt(0) || 'S').toUpperCase()
                    )}
                  </div>
                  <div className="cr-student-info">
                    <h2>
                      <span>{p.full_name || 'Unnamed student'}</span>
                      {p.is_approved && (
                        <CheckCircle2 size={15} className="cr-verified-icon" aria-label="Approved" />
                      )}
                    </h2>
                    <p className="cr-username">@{p.username || 'username'}</p>
                    <div className="cr-student-meta">
                      <span>
                        <Phone size={12} aria-hidden="true" />
                        {p.phone || 'No phone'}
                      </span>
                      <span>
                        <Building2 size={12} aria-hidden="true" />
                        {p.college || 'No institution'}
                      </span>
                    </div>
                  </div>
                </div>

                {p.is_approved ? (
                  <button
                    type="button"
                    onClick={() => void handleToggleApproval(p.id, Boolean(p.is_approved))}
                    disabled={approvingId === p.id}
                    className="cr-revoke-btn"
                  >
                    {approvingId === p.id ? 'Updating…' : 'Revoke approval'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleToggleApproval(p.id, Boolean(p.is_approved))}
                    disabled={approvingId === p.id}
                    className="cr-approve-btn"
                  >
                    {approvingId === p.id ? 'Approving…' : 'Approve profile'}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="cr-footer">
        {BRAND_NAME} {BRAND_YEAR} · Class Representative Portal
      </footer>
    </div>
  );
};
