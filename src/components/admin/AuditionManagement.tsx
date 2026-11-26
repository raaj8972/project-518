import { usePdfBranding } from '../../hooks/usePdfBranding';
import React, { useEffect, useMemo, useState } from 'react';
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, Cross2Icon, DownloadIcon, EnvelopeClosedIcon, ExternalLinkIcon, EyeOpenIcon, FileTextIcon, MagnifyingGlassIcon, MixerHorizontalIcon, ReloadIcon, ResetIcon, SpeakerLoudIcon, TrashIcon } from '@radix-ui/react-icons';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useRegistrationMutations } from '../../hooks/useRegistrationMutations';
import { exportAuditionsToExcel } from '../../utils/excelExport';
import { exportAuditionsToPDF, exportAuditionsByStatus } from '../../utils/pdfExport';
import { ParticipantMenu, ParticipantMetrics, ParticipantStatus, ParticipantLoading, participantDate, participantInitials } from './participants/ParticipantWorkspace';

export const AuditionManagement: React.FC = () => {
  const { auditions, updateAuditionStatus, deleteAudition, adminUsers, refreshAll, auditionsLoading, auditionsError, refreshAuditions, loading: dataLoading, isOwner: checkIsOwner } = useData();
  const { user } = useAuth();
  const loading = auditionsLoading ?? dataLoading;
  const { updateBatchGlobally } = useRegistrationMutations(() => { void refreshAll(); });
  const isOwner = useMemo(() => checkIsOwner() || adminUsers?.some(admin => admin.user_id === user?.id && (admin.role === 'owner' || admin.is_primary)), [adminUsers, user, checkIsOwner]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAudition, setExpandedAudition] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [editingBatch, setEditingBatch] = useState<string | null>(null);
  const [batchDraft, setBatchDraft] = useState('');
  const pageSize = 20;
  const branding = usePdfBranding();
  const { watermarkUrl, watermarkDataUrl, stampUrl, stampDataUrl } = branding;
  const uploadingWatermark = branding.busy === 'watermark';
  const uploadingStamp = branding.busy === 'stamp';
  const handleWatermarkUpload = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void branding.upload('watermark', file); };
  const handleStampUpload = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void branding.upload('stamp', file); };
  const handleWatermarkDelete = () => { if (confirm('Remove the PDF watermark?')) void branding.remove('watermark'); };
  const handleStampDelete = () => { if (confirm('Remove the shared PDF stamp?')) void branding.remove('stamp'); };

  const batches = useMemo(() => [...new Set(auditions.map(entry => entry.participant_type).filter(Boolean))].sort(), [auditions]);
  const roles = useMemo(() => [...new Set(auditions.map(entry => entry.instrument_role).filter(Boolean))].sort(), [auditions]);
  const filtered = useMemo(() => auditions.filter(entry =>
    (selectedStatus === 'all' || entry.status === selectedStatus) &&
    (selectedBatch === 'all' || entry.participant_type === selectedBatch) &&
    (selectedRole === 'all' || entry.instrument_role === selectedRole) &&
    (!searchTerm.trim() || [entry.full_name, entry.email, entry.phone, entry.instrument_role, entry.id].some(value => value?.toLowerCase().includes(searchTerm.trim().toLowerCase())))
  ), [auditions, selectedStatus, selectedBatch, selectedRole, searchTerm]);
  useEffect(() => { setPage(1); }, [selectedStatus, selectedBatch, selectedRole, searchTerm]);
  useEffect(() => { setPage(value => Math.min(value, Math.max(1, Math.ceil(filtered.length / pageSize)))); }, [filtered.length]);
  const reportRows = filtered.map(entry => ({ ...entry, portfolio_link: entry.portfolio_link || undefined }));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = !!searchTerm || selectedStatus !== 'all' || selectedBatch !== 'all' || selectedRole !== 'all';
  const clearFilters = () => { setSelectedStatus('all'); setSelectedBatch('all'); setSelectedRole('all'); setSearchTerm(''); setPage(1); };
  const run = async (id: string, action: () => Promise<void>) => {
    if (busyIds.has(id)) return;
    setError(null); setBusyIds(previous => new Set(previous).add(id));
    try { await action(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'This application could not be updated. Please try again.'); }
    finally { setBusyIds(previous => { const next = new Set(previous); next.delete(id); return next; }); }
  };
  const updateStatus = (id: string, status: 'pending' | 'reviewed' | 'contacted') => run(id, () => updateAuditionStatus(id, status));
  const remove = (id: string, name: string) => {
    if (!confirm(`Permanently delete the audition from ${name}? This cannot be undone.`)) return;
    void run(id, async () => { await deleteAudition(id); if (expandedAudition === id) setExpandedAudition(null); });
  };
  const exportFile = async (action: () => unknown) => { setError(null); try { await action(); } catch { setError('The report could not be exported. Please try again.'); } };
  return <div className="participants-workspace">
    <ParticipantMetrics value={selectedStatus} loading={loading} onChange={setSelectedStatus} items={[
      { id: 'all', label: 'Total auditions', count: auditions.length, description: 'Applications for Home Bound' },
      { id: 'pending', label: 'Pending review', count: auditions.filter(entry => entry.status === 'pending').length, description: 'New talent to discover' },
      { id: 'reviewed', label: 'Reviewed', count: auditions.filter(entry => entry.status === 'reviewed').length, description: 'Applications assessed' },
      { id: 'contacted', label: 'Contacted', count: auditions.filter(entry => entry.status === 'contacted').length, description: 'Follow-up recorded' },
    ]} />
    <div className="participants-tools"><div><h2>Band auditions<small>{loading ? '…' : auditions.length}</small></h2><p>Discover the people behind the next Home Bound performance.</p></div><div className="participants-tools__actions"><a className="participants-button is-quiet" href="/home-bound" target="_blank" rel="noreferrer"><ExternalLinkIcon />View band page</a><button className="participants-button" disabled={loading} onClick={() => void run('refresh', refreshAuditions || refreshAll)}><ReloadIcon />Refresh</button><ParticipantMenu label="Export" icon={<DownloadIcon />} disabled={branding.loading || !!branding.busy || !!branding.error}><small>Export all {filtered.length} matching applications</small><button disabled={!filtered.length} onClick={() => void exportFile(() => exportAuditionsToExcel(filtered, 'band-auditions.xlsx'))}><DownloadIcon />Excel spreadsheet</button><button disabled={!filtered.length} onClick={() => void exportFile(() => exportAuditionsToPDF(reportRows, { filename: 'band-auditions.pdf', title: 'Home Bound Audition Applications', includeDetails: true, watermarkDataUrl, stampDataUrl }))}><FileTextIcon />Detailed PDF report</button><button disabled={!filtered.length} onClick={() => void exportFile(() => exportAuditionsByStatus(reportRows, watermarkDataUrl, stampDataUrl))}><FileTextIcon />PDF grouped by status</button></ParticipantMenu></div></div>
    {branding.error && <div className="participants-error" role="alert"><span>{branding.error}</span><button className="participants-button" onClick={() => void branding.reload()}>Retry branding</button></div>}
    {auditionsError && <div className="participants-error" role="alert"><span>{auditionsError}</span><button className="participants-button" onClick={() => void run('refresh', refreshAuditions || refreshAll)}>Retry auditions</button></div>}
    {error && <div className="participants-error" role="alert"><span>{error}</span><button className="participants-icon" aria-label="Dismiss audition error" onClick={() => setError(null)}><Cross2Icon /></button></div>}
    <section className="participants-catalog" aria-label="Band audition applications" aria-busy={loading}>
      <div className="participants-filters">
        <label className="participants-field"><span>Search auditions</span><div className="participants-search"><MagnifyingGlassIcon /><input type="search" placeholder="Search name, email, instrument or ID…" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} /></div></label>
        <label className="participants-field"><span>Instrument / role</span><select value={selectedRole} onChange={event => setSelectedRole(event.target.value)}><option value="all">All instruments & roles</option>{roles.map(role => <option key={role} value={role}>{role}</option>)}</select></label>
        <label className="participants-field"><span>Batch</span><select value={selectedBatch} onChange={event => setSelectedBatch(event.target.value)}><option value="all">All batches</option>{batches.map(batch => <option key={batch} value={batch}>{batch}</option>)}</select></label>
        <label className="participants-field"><span>Status</span><select value={selectedStatus} onChange={event => setSelectedStatus(event.target.value)}><option value="all">All statuses</option><option value="pending">Pending review</option><option value="reviewed">Reviewed</option><option value="contacted">Contacted</option></select></label>
      </div>
      <div className="participants-result-bar"><span>{loading ? 'Loading applications…' : `${filtered.length} ${filtered.length === 1 ? 'application' : 'applications'}`} · Home Bound</span><div>{hasFilters && <button className="participants-text-button" onClick={clearFilters}>Clear filters</button>}<span>Review → Contact → Follow up</span></div></div>
      {loading ? <ParticipantLoading label="Loading band auditions" /> : <div className="participants-table-scroll"><table className="participants-table"><thead><tr><th>Applicant</th><th>Instrument / role</th><th>Batch</th><th>Status</th><th className="participants-optional">Applied</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map(audition => <React.Fragment key={audition.id}>
        <tr><td><div className="participants-person"><span className="participants-avatar">{participantInitials(audition.full_name)}</span><div><button aria-expanded={expandedAudition === audition.id} onClick={() => setExpandedAudition(expandedAudition === audition.id ? null : audition.id)}>{audition.full_name}</button><small>{audition.email}</small></div></div></td><td><div className="participants-cell"><strong>{audition.instrument_role}</strong>{audition.portfolio_link && <a href={audition.portfolio_link} target="_blank" rel="noopener noreferrer">View portfolio ↗</a>}</div></td><td><div className="participants-cell"><strong>{audition.participant_type || '—'}</strong></div></td><td><ParticipantStatus status={audition.status} /></td><td className="participants-optional"><span className="whitespace-nowrap text-[10px]">{participantDate(audition.created_at)}</span></td><td><div className="participants-actions"><button className="participants-icon" aria-label={`View ${audition.full_name}`} aria-expanded={expandedAudition === audition.id} onClick={() => setExpandedAudition(expandedAudition === audition.id ? null : audition.id)}><EyeOpenIcon /></button>{audition.status !== 'contacted' && <button className="participants-icon" disabled={busyIds.has(audition.id) || !!auditionsError} aria-label={`${audition.status === 'pending' ? 'Mark reviewed' : 'Mark contacted'}: ${audition.full_name}`} onClick={() => void updateStatus(audition.id, audition.status === 'pending' ? 'reviewed' : 'contacted')}><CheckIcon /></button>}</div></td></tr>
        {expandedAudition === audition.id && <tr className="participants-detail"><td colSpan={6}><div className="participants-detail__content"><div><h4>Application details</h4><dl><div><dt>Application ID</dt><dd>{audition.id}</dd></div><div><dt>Submitted</dt><dd>{participantDate(audition.created_at)}</dd></div><div><dt>Email address</dt><dd><a href={`mailto:${audition.email}`}>{audition.email}</a></dd></div><div><dt>Phone number</dt><dd><a href={`tel:${audition.phone}`}>{audition.phone || 'Not provided'}</a></dd></div><div><dt>Batch</dt><dd>{editingBatch === audition.id ? <form onSubmit={event => { event.preventDefault(); if (!batchDraft.trim()) return; void run(audition.id, async () => { await updateBatchGlobally(audition.email, batchDraft.trim()); setEditingBatch(null); }); }}><label className="participants-field"><span>Update batch across this applicant’s records</span><input aria-label="Applicant batch" value={batchDraft} onChange={event => setBatchDraft(event.target.value)} required /></label><div className="flex gap-2 mt-2"><button className="participants-button" disabled={busyIds.has(audition.id) || !!auditionsError}>Save batch</button><button type="button" className="participants-button is-quiet" onClick={() => setEditingBatch(null)}>Cancel</button></div></form> : <>{audition.participant_type || 'Not provided'}{isOwner && <button className="participants-text-button ml-2" onClick={() => { setEditingBatch(audition.id); setBatchDraft(audition.participant_type || ''); }}>Edit batch</button>}</>}</dd></div><div><dt>Instrument / role</dt><dd>{audition.instrument_role}</dd></div></dl></div><div><h4>Experience & motivation</h4><p>{audition.experience_motivation || 'No additional details were provided.'}</p>{audition.portfolio_link && <a className="participants-button mt-4" href={audition.portfolio_link} target="_blank" rel="noopener noreferrer"><ExternalLinkIcon />Open portfolio</a>}</div></div><div className="participants-detail__actions">{audition.status === 'pending' && <button className="participants-button is-primary" disabled={busyIds.has(audition.id) || !!auditionsError} onClick={() => void updateStatus(audition.id, 'reviewed')}><CheckIcon />Mark as reviewed</button>}{audition.status === 'reviewed' && <button className="participants-button is-primary" disabled={busyIds.has(audition.id) || !!auditionsError} onClick={() => void updateStatus(audition.id, 'contacted')}><CheckIcon />Mark as contacted</button>}<a className="participants-button" href={`mailto:${audition.email}`}><EnvelopeClosedIcon />Email applicant</a>{audition.status !== 'pending' && isOwner && <button className="participants-button" disabled={busyIds.has(audition.id) || !!auditionsError} onClick={() => void updateStatus(audition.id, 'pending')}><ResetIcon />Return to pending</button>}<button className="participants-button is-danger" disabled={busyIds.has(audition.id) || !!auditionsError} onClick={() => remove(audition.id, audition.full_name)}><TrashIcon />Delete application</button></div></td></tr>}
      </React.Fragment>)}</tbody></table></div>}
      {!loading && !auditionsError && !filtered.length && <div className="participants-empty"><span><SpeakerLoudIcon /></span><h3>{hasFilters ? 'No matching auditions' : 'Make room for the next performance'}</h3><p>{hasFilters ? 'Try a different instrument, batch or search term to find an applicant.' : 'Home Bound audition applications will appear here, ready for you to discover and review.'}</p>{hasFilters && <button className="participants-button" onClick={clearFilters}>Clear filters</button>}</div>}
      {!!filtered.length && <div className="participants-pagination"><div>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</div><div><button className="participants-icon" aria-label="Previous audition page" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}><ChevronLeftIcon /></button><span>{page} / {Math.max(1, Math.ceil(filtered.length / pageSize))}</span><button className="participants-icon" aria-label="Next audition page" disabled={page >= Math.ceil(filtered.length / pageSize) || loading} onClick={() => setPage(value => value + 1)}><ChevronRightIcon /></button></div></div>}
    </section>
    <div className="participants-bottom-tools"><span><SpeakerLoudIcon />Home Bound applications have their own review process.</span><span>Marking “Contacted” records a follow-up.</span></div>
    <details className="participants-extra"><summary><MixerHorizontalIcon />PDF branding & report settings<ChevronDownIcon /></summary><div className="participants-assets">
      {[{ label: 'PDF watermark', url: watermarkUrl, busy: uploadingWatermark, upload: handleWatermarkUpload, remove: handleWatermarkDelete, help: 'Add a transparent PNG or SVG to exported reports.' }, { label: 'Official stamp', url: stampUrl, busy: uploadingStamp, upload: handleStampUpload, remove: handleStampDelete, help: 'Place the festival’s stamp on your PDF reports.' }].map(asset => <div className="participants-asset" key={asset.label}>{asset.url && <img src={asset.url} alt={asset.label} />}<div><strong>{asset.label}</strong><span>{asset.help}</span><div><label className="participants-button">{asset.busy ? 'Uploading…' : 'Upload PNG / SVG'}<input type="file" accept="image/png,image/svg+xml" className="sr-only" aria-label={`Upload ${asset.label}`} disabled={branding.loading || !!branding.busy || !!branding.error} onChange={asset.upload} /></label>{asset.url && <button className="participants-button is-quiet" disabled={branding.loading || !!branding.busy || !!branding.error} onClick={asset.remove}>Remove</button>}</div></div></div>)}
    </div></details>
  </div>;
};
