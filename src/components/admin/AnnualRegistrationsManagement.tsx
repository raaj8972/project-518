import React, { useState, useMemo } from 'react';
import { Search, Filter, CheckCircle, XCircle, Trash2, Mail, Phone, User, Calendar, Tag, ShieldCheck } from 'lucide-react';
import { useAnnualSports } from '../../context/AnnualSportsContext';

const badgeCls = 'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border';

export const AnnualRegistrationsManagement: React.FC = () => {
  const { annualRegistrations, annualEvents, updateAnnualRegistrationStatus, deleteAnnualRegistration } = useAnnualSports();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');

  const filteredRegistrations = useMemo(() => {
    return annualRegistrations.filter(reg => {
      const matchesSearch = reg.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           reg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           reg.reg_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
      const matchesEvent = eventFilter === 'all' || reg.event_id === eventFilter;
      return matchesSearch && matchesStatus && matchesEvent;
    });
  }, [annualRegistrations, searchTerm, statusFilter, eventFilter]);

  const stats = useMemo(() => {
    return {
      total: annualRegistrations.length,
      pending: annualRegistrations.filter(r => r.status === 'pending').length,
      approved: annualRegistrations.filter(r => r.status === 'approved').length,
      rejected: annualRegistrations.filter(r => r.status === 'rejected').length
    };
  }, [annualRegistrations]);

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateAnnualRegistrationStatus(id, status);
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const getEventName = (id: string) => {
    return annualEvents.find(e => e.id === id)?.name || 'Unknown Event';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Annual Registrations</h2>
          <p className="text-white/50 text-sm">Review and manage participant applications for annual sports.</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-[10px] text-white/30 font-black uppercase tracking-widest">Total</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.pending}</div>
            <div className="text-[10px] text-amber-400/50 font-black uppercase tracking-widest text-[#ffbe0b]">Pending</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.approved}</div>
            <div className="text-[10px] text-emerald-400/50 font-black uppercase tracking-widest">Approved</div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-rose-400">{stats.rejected}</div>
            <div className="text-[10px] text-rose-400/50 font-black uppercase tracking-widest text-[#ef476f]">Rejected</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search by name, email or ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-10 text-sm text-white focus:outline-none focus:border-gold-500/50"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/30" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-gold-500/50"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-white/30" />
          <select
            value={eventFilter}
            onChange={e => setEventFilter(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-gold-500/50"
          >
            <option value="all">All Events</option>
            {annualEvents.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredRegistrations.map((reg) => (
          <div key={reg.id} className="bg-[#0a0a12] border border-white/5 p-6 rounded-2xl group hover:border-white/10 transition-all">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                  {reg.photo_url ? (
                    <img src={reg.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-gold-500/50" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-white tracking-tight">{reg.full_name}</h3>
                    <span className="text-[10px] font-black x-2 py-0.5 rounded border border-white/10 uppercase tracking-widest bg-dark-site-800 text-gold-500">{reg.reg_id}</span>
                    {(() => {
                      const event = annualEvents.find(e => e.id === reg.event_id);
                      const regCount = annualRegistrations.filter(r => r.event_id === reg.event_id && r.status !== 'rejected').length;
                      if (event?.registration_limit) {
                        return (
                          <span className="text-[10px] font-black text-white/30 bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase tracking-widest">
                            {regCount}/{event.registration_limit} Joined
                          </span>
                        );
                      }
                      
                      if (event?.group_limits) {
                        const fieldName = event.group_limits.field_name;
                        const groupValue = (reg as any)[fieldName] || reg.metadata?.[fieldName];
                        if (groupValue && event.group_limits.limits[groupValue]) {
                          const limit = event.group_limits.limits[groupValue];
                          const groupRegCount = annualRegistrations.filter(r => {
                            if (r.event_id !== reg.event_id || r.status === 'rejected') return false;
                            const rVal = (r as any)[fieldName] || r.metadata?.[fieldName];
                            return rVal === groupValue;
                          }).length;
                          return (
                            <span className="text-[10px] font-black text-amber-500/80 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 uppercase tracking-widest">
                              {groupValue}: {groupRegCount}/{limit} Slots
                            </span>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
                    <div className="flex items-center gap-2 text-white/50 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-gold-500" />
                      {getEventName(reg.event_id)}
                    </div>
                    <div className="flex items-center gap-2 text-white/50 text-xs">
                      <Mail className="w-3.5 h-3.5" />
                      {reg.email}
                    </div>
                    <div className="flex items-center gap-2 text-white/50 text-xs">
                      <Phone className="w-3.5 h-3.5" />
                      {reg.phone}
                    </div>
                    <div className="flex items-center gap-2 text-white/50 text-xs">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {reg.department} ({reg.year} Year, {reg.roll_no})
                    </div>
                  </div>
                  
                  {/* Custom Metadata */}
                  {reg.metadata && Object.keys(reg.metadata).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(reg.metadata || {}).map(([key, value]) => {
                        if (key === 'team_photo_url' || key === 'team_logo_url') return null;
                        return (
                          <div key={key} className="px-2 py-1 bg-white/5 rounded-lg border border-white/10 flex items-center gap-2">
                            <span className="text-[10px] font-black text-gold-500/50 uppercase tracking-widest">{key.replace(/_/g, ' ')}:</span>
                            <span className="text-xs text-white/70">{String(value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Team Logo Display */}
                  {reg.metadata?.team_logo_url && (
                    <div className="mt-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 inline-flex flex-col items-center gap-2">
                       <span className="text-[10px] font-black text-gold-500/50 uppercase tracking-widest self-start mb-2">Team Logo</span>
                       <img src={reg.metadata.team_logo_url} alt="Team Logo" className="w-32 h-32 object-contain rounded-xl border border-white/10" />
                    </div>
                  )}

                  {/* Team Members List */}
                  {reg.is_team_registration && reg.team_members && reg.team_members.length > 0 && (
                    <div className="mt-4 space-y-3">
                       <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Team Members</h4>
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {reg.team_members.map((member: any, idx: number) => (
                             <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                   {member.photo_url ? (
                                      <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
                                   ) : (
                                      <User size={16} className="text-white/20" />
                                   )}
                                </div>
                                <div>
                                   <div className="text-xs font-bold text-white">{member.name}</div>
                                   {member.email && <div className="text-[10px] text-white/40">{member.email}</div>}
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 lg:self-center">
                <div className={`
                  ${reg.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}
                  ${reg.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : ''}
                  ${reg.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : ''}
                  ${badgeCls}
                `}>
                  {reg.status}
                </div>

                <div className="flex items-center gap-2">
                  {reg.status !== 'approved' && (
                    <button
                      onClick={() => handleStatusChange(reg.id, 'approved')}
                      className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-colors"
                      title="Approve"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                  {reg.status !== 'rejected' && (
                    <button
                      onClick={() => handleStatusChange(reg.id, 'rejected')}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors"
                      title="Reject"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => { if(confirm('Delete registration?')) deleteAnnualRegistration(reg.id); }}
                    className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/30 rounded-xl transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredRegistrations.length === 0 && (
          <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
            <Search className="w-16 h-16 text-white/5 mx-auto mb-4" />
            <p className="text-white/40 font-medium">No registrations found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};
