import React, { useState, useMemo } from 'react';
import {
  Award, TrendingUp, DollarSign, Clock,
  Plus, Trash2, User,
  Package, X, Loader2, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface CouncilSponsor {
  id: string;
  name: string;
  tier: string;
  status: 'lead' | 'discussion' | 'committed' | 'received' | 'completed';
  committed_amount: number;
  received_amount: number;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  deliverables: string | null;
  deliverables_status: 'pending' | 'in_progress' | 'completed';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CouncilSponsorsTabProps {
  sponsors: CouncilSponsor[];
  onRefresh: () => Promise<void>;
  councilToken: string;
}

const SPONSOR_TIERS: Record<string, { label: string; color: string }> = {
  title_sponsor: { label: 'Title Sponsor', color: 'from-amber-400 to-yellow-600 text-amber-950 border-amber-300' },
  powered_by: { label: 'Powered By', color: 'from-purple-500 to-indigo-600 text-white border-purple-400' },
  associate: { label: 'Associate Sponsor', color: 'from-cyan-500 to-blue-600 text-white border-cyan-400' },
  co_sponsor: { label: 'Co-Sponsor', color: 'from-emerald-500 to-teal-600 text-white border-emerald-400' },
  food_partner: { label: 'Food Partner', color: 'from-orange-500 to-rose-600 text-white border-orange-400' },
  media_partner: { label: 'Media Partner', color: 'from-rose-500 to-pink-600 text-white border-rose-400' },
  other: { label: 'Partner / Vendor', color: 'from-gray-600 to-gray-700 text-white border-gray-500' }
};

export const CouncilSponsorsTab: React.FC<CouncilSponsorsTabProps> = ({
  sponsors,
  onRefresh,
  councilToken
}) => {
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // New Sponsor Form State
  const [name, setName] = useState('');
  const [tier, setTier] = useState('title_sponsor');
  const [status, setStatus] = useState<'lead' | 'discussion' | 'committed' | 'received' | 'completed'>('discussion');
  const [committedAmount, setCommittedAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [deliverablesStatus, setDeliverablesStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [notes, setNotes] = useState('');

  // Financial Totals
  const totalCommitted = useMemo(() => {
    return sponsors.reduce((acc, s) => acc + Number(s.committed_amount || 0), 0);
  }, [sponsors]);

  const totalReceived = useMemo(() => {
    return sponsors.reduce((acc, s) => acc + Number(s.received_amount || 0), 0);
  }, [sponsors]);

  const pendingReceivables = totalCommitted - totalReceived;
  const collectionRate = totalCommitted > 0 ? Math.round((totalReceived / totalCommitted) * 100) : 0;
  const completedDeliverables = sponsors.filter(s => s.deliverables_status === 'completed').length;

  const filteredSponsors = useMemo(() => {
    return sponsors.filter(s => {
      if (filterTier !== 'all' && s.tier !== filterTier) return false;
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      return true;
    });
  }, [sponsors, filterTier, filterStatus]);

  const formatCurrency = (amt: number) => {
    return '₹' + Number(amt || 0).toLocaleString('en-IN');
  };

  const handleUpdateDeliverablesStatus = async (id: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'sponsor-update',
          payload: { id, updates: { deliverables_status: newStatus } }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Update failed');
      toast.success('Deliverables progress updated');
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleQuickAddPayment = async (sponsor: CouncilSponsor) => {
    const input = window.prompt(`Enter additional payment received from "${sponsor.name}" (₹):`, '10000');
    if (!input || isNaN(Number(input))) return;
    const additional = Number(input);
    const newTotal = Number(sponsor.received_amount || 0) + additional;

    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'sponsor-update',
          payload: {
            id: sponsor.id,
            updates: {
              received_amount: newTotal,
              status: newTotal >= Number(sponsor.committed_amount) ? 'received' : sponsor.status
            }
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Payment record failed');
      toast.success(`Recorded +${formatCurrency(additional)} from ${sponsor.name}!`);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Payment record failed');
    }
  };

  const handleDeleteSponsor = async (id: string, sponsorName: string) => {
    if (!window.confirm(`Delete sponsor entry "${sponsorName}"?`)) return;
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'sponsor-delete',
          payload: { id }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Delete failed');
      toast.success('Sponsor deleted');
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleCreateSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Sponsor name is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'sponsor-create',
          payload: {
            name: name.trim(),
            tier,
            status,
            committed_amount: Number(committedAmount || 0),
            received_amount: Number(receivedAmount || 0),
            contact_person: contactPerson.trim() || null,
            contact_phone: contactPhone.trim() || null,
            deliverables: deliverables.trim() || null,
            deliverables_status: deliverablesStatus,
            notes: notes.trim() || null
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Sponsor creation failed');
      toast.success('Sponsor added to tracker!');
      setShowAddModal(false);
      setName('');
      setCommittedAmount('');
      setReceivedAmount('');
      setContactPerson('');
      setContactPhone('');
      setDeliverables('');
      setNotes('');
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'received':
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">Funds Received</span>;
      case 'committed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">MoU Committed</span>;
      case 'discussion':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">In Discussion</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/20 text-gray-300 border border-gray-500/30 uppercase tracking-wider">Prospect Lead</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Financial & Sponsorship Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
          <div className="text-gray-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
            Total Committed
          </div>
          <div className="text-2xl font-black text-white">{formatCurrency(totalCommitted)}</div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
          <div className="text-gray-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Funds Collected
          </div>
          <div className="text-2xl font-black text-emerald-300">
            {formatCurrency(totalReceived)}
            <span className="text-xs text-gray-400 font-normal ml-1">({collectionRate}%)</span>
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
          <div className="text-gray-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Receivables Pending
          </div>
          <div className="text-2xl font-black text-amber-300">{formatCurrency(pendingReceivables)}</div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
          <div className="text-gray-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-cyan-400" />
            Deliverables Delivered
          </div>
          <div className="text-2xl font-black text-cyan-300">
            {completedDeliverables} <span className="text-xs text-gray-400 font-normal">/ {sponsors.length} Partners</span>
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-900/50 border border-gray-800 p-4 md:p-5 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Sponsors:
          </span>
          <select
            value={filterTier}
            onChange={e => setFilterTier(e.target.value)}
            className="bg-black/60 border border-gray-700 text-xs text-gray-300 rounded-lg px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">All Tiers</option>
            {Object.entries(SPONSOR_TIERS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-black/60 border border-gray-700 text-xs text-gray-300 rounded-lg px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="committed">Committed</option>
            <option value="received">Received</option>
            <option value="discussion">In Discussion</option>
            <option value="lead">Lead</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-semibold text-xs md:text-sm px-4 py-2 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add New Sponsor
        </button>
      </div>

      {/* Sponsor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredSponsors.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-gray-900/20 border border-gray-800/80 rounded-2xl text-gray-500">
            <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No sponsors found matching current filters.</p>
          </div>
        ) : (
          filteredSponsors.map(sponsor => {
            const tierInfo = SPONSOR_TIERS[sponsor.tier] || SPONSOR_TIERS.other;
            const collectedPercent = Number(sponsor.committed_amount) > 0
              ? Math.min(Math.round((Number(sponsor.received_amount) / Number(sponsor.committed_amount)) * 100), 100)
              : 0;

            return (
              <div
                key={sponsor.id}
                className="bg-gray-900/50 border border-gray-800 hover:border-gray-700 rounded-3xl p-5 md:p-6 backdrop-blur-sm flex flex-col justify-between transition-all group hover:shadow-xl hover:shadow-indigo-500/5"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r ${tierInfo.color} mb-2`}>
                        {tierInfo.label}
                      </span>
                      <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {sponsor.name}
                      </h3>
                    </div>
                    <div>
                      {getStatusBadge(sponsor.status)}
                    </div>
                  </div>

                  {/* Financial Bar */}
                  <div className="bg-black/50 border border-gray-800/80 rounded-2xl p-4 my-3 space-y-2">
                    <div className="flex justify-between items-end text-xs">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Received</span>
                        <strong className="text-emerald-400 font-mono text-base font-black">
                          {formatCurrency(sponsor.received_amount)}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Committed</span>
                        <strong className="text-white font-mono text-base font-black">
                          {formatCurrency(sponsor.committed_amount)}
                        </strong>
                      </div>
                    </div>

                    <div className="h-1.5 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-800">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-700"
                        style={{ width: `${collectedPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                      <span>{collectedPercent}% collected</span>
                      {Number(sponsor.committed_amount) > Number(sponsor.received_amount) && (
                        <span className="text-amber-400 font-semibold">
                          {formatCurrency(Number(sponsor.committed_amount) - Number(sponsor.received_amount))} remaining
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  {sponsor.contact_person && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 my-2">
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{sponsor.contact_person}</span>
                      {sponsor.contact_phone && (
                        <span className="text-gray-500">({sponsor.contact_phone})</span>
                      )}
                    </div>
                  )}

                  {/* Deliverables / Perks Box */}
                  {sponsor.deliverables && (
                    <div className="mt-3 p-3 bg-black/40 border border-gray-800/60 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3 text-indigo-400" />
                          Agreed Deliverables:
                        </span>
                        <span className={`px-2 py-0.5 rounded ${
                          sponsor.deliverables_status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : sponsor.deliverables_status === 'in_progress'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {sponsor.deliverables_status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 leading-snug">
                        {sponsor.deliverables}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-800/60">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-500 font-semibold mr-1">Deliverables:</span>
                    <button
                      disabled={updatingId === sponsor.id}
                      onClick={() => handleUpdateDeliverablesStatus(sponsor.id, 'in_progress')}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                        sponsor.deliverables_status === 'in_progress'
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                          : 'border-gray-800 text-gray-500 hover:text-white'
                      }`}
                    >
                      Working
                    </button>
                    <button
                      disabled={updatingId === sponsor.id}
                      onClick={() => handleUpdateDeliverablesStatus(sponsor.id, 'completed')}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                        sponsor.deliverables_status === 'completed'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-gray-800 text-gray-500 hover:text-white'
                      }`}
                    >
                      Fulfilled
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuickAddPayment(sponsor)}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2.5 py-1 rounded-xl transition-all"
                      title="Record payment"
                    >
                      + Payment
                    </button>
                    <button
                      onClick={() => handleDeleteSponsor(sponsor.id, sponsor.name)}
                      className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                      title="Delete sponsor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Sponsor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Onboard Festival Sponsor
            </h2>
            <p className="text-xs text-gray-400 mb-6">Track commitments, payment installments, and brand perks.</p>

            <form onSubmit={handleCreateSponsor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Sponsor / Brand Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Red Bull Energy"
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Sponsorship Tier</label>
                  <select
                    value={tier}
                    onChange={e => setTier(e.target.value)}
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {Object.entries(SPONSOR_TIERS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Current Deal Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="lead">Prospect Lead</option>
                    <option value="discussion">In Discussion</option>
                    <option value="committed">MoU Committed</option>
                    <option value="received">Funds Received</option>
                    <option value="completed">Completed / Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Committed Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={committedAmount}
                    onChange={e => setCommittedAmount(e.target.value)}
                    placeholder="e.g., 100000"
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Received Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={receivedAmount}
                    onChange={e => setReceivedAmount(e.target.value)}
                    placeholder="e.g., 50000"
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="e.g., Sameer Nair"
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Contact Phone / Email</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Deliverables Status</label>
                  <select
                    value={deliverablesStatus}
                    onChange={e => setDeliverablesStatus(e.target.value as any)}
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Internal Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g., MOU signed, awaiting invoice"
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Agreed Deliverables & Brand Perks</label>
                <textarea
                  rows={2}
                  value={deliverables}
                  onChange={e => setDeliverables(e.target.value)}
                  placeholder="e.g., Main stage arch branding, 10 VIP passes, 1 food stall space..."
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
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
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-600/30 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Sponsor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
