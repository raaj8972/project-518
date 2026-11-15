import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { supabase } from '../../lib/supabase';
import { getSecurityStats, type SecurityStats } from '../../lib/firewall';
import { useToast } from '../ToastProvider';

export const ProtectionCenter = () => {
  const { siteSettings, securitySettings, updateSiteSettings, updateSecuritySettings, isOwner } = useData();
  const { push } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = async () => {
    setBusy(true);
    setError('');
    try {
      const { data, error } = await supabase.from('security_logs').select('event_type, severity, created_at').order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      setLogs(data || []);
      setStats(await getSecurityStats());
    } catch { setError('Could not load security activity. Check your session and database permissions.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void refresh(); }, []);
  const changeSetting = async (kind: 'panic' | 'maintenance') => {
    setBusy(true);
    try {
      if (kind === 'panic') await updateSecuritySettings({ panic_mode: !(securitySettings as any)?.panic_mode } as any);
      else await updateSiteSettings({ site_closed: !siteSettings?.site_closed });
      push({ type: 'success', message: 'Setting saved' });
    } catch (error: any) { push({ type: 'error', message: error.message || 'Could not save setting' }); }
    finally { setBusy(false); }
  };
  const exportAudit = async () => {
    setBusy(true);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      pdf.setFontSize(18); pdf.text('Ricorrenza security activity', 14, 20);
      pdf.setFontSize(10); pdf.text(`Generated: ${new Date().toISOString()}`, 14, 30);
      pdf.text(`Recent scans: ${stats?.totalScans ?? 0}; rejected attempts: ${stats?.blockedAttempts ?? 0}`, 14, 40);
      let y = 52;
      for (const log of logs) {
        if (y > 275) { pdf.addPage(); y = 20; }
        pdf.text(pdf.splitTextToSize(`${log.created_at} | ${log.severity} | ${log.event_type}`, 180), 14, y);
        y += 14;
      }
      if (!logs.length) pdf.text('No security activity records loaded.', 14, y);
      pdf.save('ricorrenza-security-activity.pdf');
    } catch { push({ type: 'error', message: 'Could not export security activity' }); }
    finally { setBusy(false); }
  };
  const button = 'px-5 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40';
  return <section className="space-y-6 text-white">
    <h2 className="text-3xl font-black">Protection Center</h2>
    <p className="text-gray-400">Review recorded activity and manage site availability.</p>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    <div className="grid sm:grid-cols-3 gap-4">
      <div className="p-5 rounded-xl bg-white/5">Recent scans: {stats?.totalScans ?? '—'}</div>
      <div className="p-5 rounded-xl bg-white/5">Rejected attempts: {stats?.blockedAttempts ?? '—'}</div>
      <div className="p-5 rounded-xl bg-white/5">Threat indicator: {stats?.threatLevel ?? 'Unavailable'}</div>
    </div>
    <div className="flex flex-wrap gap-3">
      <button disabled={busy} onClick={refresh} className={button}>Refresh security activity</button>
      <button disabled={busy || !isOwner()} onClick={() => changeSetting('panic')} className={button}>{(securitySettings as any)?.panic_mode ? 'Resume registrations and uploads' : 'Pause registrations and uploads'}</button>
      <button disabled={busy || !isOwner()} onClick={() => changeSetting('maintenance')} className={button}>{siteSettings?.site_closed ? 'Open public site' : 'Close public site for maintenance'}</button>
      <button onClick={() => navigate('/admin/audit-logs')} className={button}>View audit logs</button>
      <button disabled={busy || !!error} onClick={exportAudit} className={button}>Download security activity PDF</button>
    </div>
    <div className="rounded-xl border border-white/10 p-5 space-y-3">
      <h3 className="font-bold">Recent security events</h3>
      {!logs.length && <p className="text-gray-400">No activity loaded.</p>}
      {logs.map((log, index) => <p key={index} className="text-sm text-gray-300">{log.created_at} · {log.severity} · {log.event_type}</p>)}
    </div>
  </section>;
};
