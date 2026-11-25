import React, { useState } from 'react';
import {
  Megaphone, AlertTriangle, Send, Trash2, Eye, EyeOff,
  Copy, Check, Calendar, Users, Plus, X, Loader2, Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface CouncilAnnouncement {
  id: string;
  title: string;
  content: string;
  target_audience: string;
  is_urgent: boolean;
  is_published: boolean;
  published_at: string;
  created_at: string;
}

interface CouncilAnnouncementsTabProps {
  announcements: CouncilAnnouncement[];
  onRefresh: () => Promise<void>;
  councilToken: string;
}

export const CouncilAnnouncementsTab: React.FC<CouncilAnnouncementsTabProps> = ({
  announcements,
  onRefresh,
  councilToken
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<CouncilAnnouncement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [isUrgent, setIsUrgent] = useState(false);

  const urgentCount = announcements.filter(a => a.is_urgent && a.is_published).length;
  const publishedCount = announcements.filter(a => a.is_published).length;

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Title and message content are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'announcement-create',
          payload: {
            title: title.trim(),
            content: content.trim(),
            target_audience: targetAudience,
            is_urgent: isUrgent
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to publish announcement');
      toast.success(isUrgent ? 'Urgent notice broadcasted!' : 'Announcement published!');
      setShowAddModal(false);
      setTitle('');
      setContent('');
      setIsUrgent(false);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Publish failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement || !editingAnnouncement.title.trim() || !editingAnnouncement.content.trim()) {
      toast.error('Title and message content are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'announcement-update',
          payload: {
            id: editingAnnouncement.id,
            title: editingAnnouncement.title.trim(),
            content: editingAnnouncement.content.trim(),
            target_audience: editingAnnouncement.target_audience,
            is_urgent: editingAnnouncement.is_urgent,
            is_published: editingAnnouncement.is_published
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update notice');
      toast.success('Notice updated successfully!');
      setEditingAnnouncement(null);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'announcement-toggle',
          payload: { id, is_published: !currentStatus }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update notice');
      toast.success(currentStatus ? 'Notice unpublished' : 'Notice live again');
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Toggle failed');
    }
  };

  const handleDeleteAnnouncement = async (id: string, noticeTitle: string) => {
    if (!window.confirm(`Delete notice "${noticeTitle}"?`)) return;
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'announcement-delete',
          payload: { id }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete');
      toast.success('Notice deleted');
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleCopyNotice = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Notice copied to clipboard');
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
          <div className="text-gray-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5 text-indigo-400" />
            Total Notices Published
          </div>
          <div className="text-2xl font-black text-white">{announcements.length}</div>
        </div>
        <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
          <div className="text-gray-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            Active Live Notices
          </div>
          <div className="text-2xl font-black text-cyan-300">{publishedCount}</div>
        </div>
        <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
          <div className="text-gray-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Urgent Broadcasts
          </div>
          <div className="text-2xl font-black text-rose-300">{urgentCount}</div>
        </div>
      </div>

      {/* Header Action Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-900/50 border border-gray-800 p-4 md:p-5 rounded-2xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-cyan-400" />
            Official Council Bulletins
          </h2>
          <p className="text-xs text-gray-400">Broadcast real-time operational updates to teams, volunteers, or attendee portals.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs md:text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Broadcast New Notice
        </button>
      </div>

      {/* Announcements Feed */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-16 bg-gray-900/20 border border-gray-800/80 rounded-2xl text-gray-500">
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No bulletins published yet.</p>
          </div>
        ) : (
          announcements.map(notice => (
            <div
              key={notice.id}
              className={`bg-gray-900/50 border rounded-2xl p-5 transition-all duration-200 ${
                notice.is_urgent
                  ? 'border-rose-500/50 bg-rose-950/10 shadow-lg shadow-rose-950/20'
                  : 'border-gray-800 hover:border-gray-700 hover:bg-gray-900/70'
              } ${!notice.is_published ? 'opacity-60' : ''}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  {notice.is_urgent ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      Urgent Alert
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                      Council Notice
                    </span>
                  )}

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-gray-400 border border-white/10 flex items-center gap-1">
                    <Users className="w-3 h-3 text-cyan-400" />
                    Audience: <strong className="text-gray-200 capitalize">{notice.target_audience}</strong>
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-gray-500 border border-white/10 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(notice.published_at || notice.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => handleCopyNotice(notice.id, `${notice.title}\n\n${notice.content}`)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    title="Copy notice text"
                  >
                    {copiedId === notice.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleTogglePublish(notice.id, notice.is_published)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      notice.is_published ? 'text-cyan-400 hover:bg-cyan-500/10' : 'text-gray-500 hover:bg-gray-800'
                    }`}
                    title={notice.is_published ? 'Make Draft' : 'Publish Live'}
                  >
                    {notice.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setEditingAnnouncement(notice)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    title="Edit notice"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAnnouncement(notice.id, notice.title)}
                    className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete notice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">{notice.title}</h3>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line bg-black/30 p-3.5 rounded-xl border border-gray-800/80">
                {notice.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Add Notice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-cyan-400" />
              Publish Announcement
            </h2>
            <p className="text-xs text-gray-400 mb-6">Create an official bulletin visible across festival dashboards.</p>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Announcement Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Gate 2 Entry Protocol & Scanner Check"
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Target Audience</label>
                  <select
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value)}
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">Everyone / All Attendees</option>
                    <option value="teams">Committee & Volunteer Teams</option>
                    <option value="coordinators">Event Coordinators</option>
                    <option value="volunteers">Security & Volunteers</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2.5 bg-black/40 border border-gray-800 rounded-xl cursor-pointer hover:border-gray-700">
                    <input
                      type="checkbox"
                      checked={isUrgent}
                      onChange={e => setIsUrgent(e.target.checked)}
                      className="rounded accent-rose-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-rose-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Mark as Urgent Notice
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Notice Content / Instructions *</label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Provide complete details, timings, venues, and contact guidelines..."
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-600/30 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <Send className="w-3.5 h-3.5" />
                  Publish Bulletin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Notice Modal */}
      {editingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setEditingAnnouncement(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-cyan-400" />
              Edit Announcement
            </h2>
            <p className="text-xs text-gray-400 mb-6">Modify notice headline, audience, or message content.</p>

            <form onSubmit={handleUpdateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Announcement Title *</label>
                <input
                  type="text"
                  required
                  value={editingAnnouncement.title}
                  onChange={e => setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })}
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Target Audience</label>
                  <select
                    value={editingAnnouncement.target_audience}
                    onChange={e => setEditingAnnouncement({ ...editingAnnouncement, target_audience: e.target.value })}
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">Everyone (All Students & Faculty)</option>
                    <option value="council">Council & Core Committee Only</option>
                    <option value="coordinators">Lead Event Coordinators</option>
                    <option value="volunteers">Volunteer Teams</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2.5 text-xs text-gray-300 font-medium cursor-pointer mt-4">
                    <input
                      type="checkbox"
                      checked={editingAnnouncement.is_urgent}
                      onChange={e => setEditingAnnouncement({ ...editingAnnouncement, is_urgent: e.target.checked })}
                      className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 border-gray-700 bg-black/60"
                    />
                    <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Mark as Urgent Notice
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Notice Content / Instructions *</label>
                <textarea
                  rows={4}
                  required
                  value={editingAnnouncement.content}
                  onChange={e => setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })}
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingAnnouncement(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-600/30 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
