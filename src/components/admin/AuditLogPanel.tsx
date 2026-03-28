import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { History, Search, User, Database, Clock, Terminal, Activity, ChevronRight, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
    id: number;
    user_id: string;
    user_email: string;
    action: string;
    table_name: string;
    record_id: string;
    old_data: any;
    new_data: any;
    created_at: string;
}

export const AuditLogPanel: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [tableFilter, setTableFilter] = useState('all');
    const pageSize = 15;

    useEffect(() => {
        fetchLogs();
    }, [page, tableFilter, searchTerm]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('audit_logs')
                .select('*', { count: 'exact' });

            if (tableFilter !== 'all') {
                query = query.eq('table_name', tableFilter);
            }

            if (searchTerm) {
                query = query.or(`user_email.ilike.%${searchTerm}%,action.ilike.%${searchTerm}%,record_id.ilike.%${searchTerm}%`);
            }

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;
            setLogs(data || []);
            setTotalCount(count || 0);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatData = (data: any) => {
        if (!data) return <span className="text-gray-700 italic text-[10px]">NULL</span>;
        if (typeof data === 'object') {
            return (
                <div className="bg-black/40 rounded-xl p-3 border border-white/5 font-mono text-[9px] max-h-32 overflow-auto custom-scrollbar group/json relative">
                    <div className="absolute top-1 right-2 text-indigo-500/30 text-[8px] font-black uppercase tracking-widest hidden group-hover/json:block">JSON_BLOCK</div>
                    <pre className="text-gray-400 leading-relaxed">{JSON.stringify(data, null, 2)}</pre>
                </div>
            );
        }
        return <span className="text-gray-300 font-mono text-[10px] break-all">{String(data)}</span>;
    };

    return (
        <div className="rico-glass-card rounded-[2.5rem] p-8 sm:p-10 border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5 opacity-50 pointer-events-none" />
            
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12 relative z-10">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-lg shadow-purple-500/5 group-hover:scale-110 transition-all duration-500">
                        <History className="w-8 h-8 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                            Temporal Nexus <span className="text-xs not-italic font-black bg-purple-500 text-white px-2 py-0.5 rounded tracking-widest uppercase">Audit</span>
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Global Action Ledger</span>
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Encrypted Event Stream</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 w-full xl:w-auto">
                    <div className="relative flex-1 sm:min-w-[300px] group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Filter sequences (email, action, record)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 transition-all font-bold"
                        />
                    </div>
                    <div className="relative group">
                        <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors pointer-events-none" />
                        <select
                            value={tableFilter}
                            onChange={(e) => setTableFilter(e.target.value)}
                            className="bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-10 py-4 text-sm font-black uppercase tracking-widest text-gray-400 focus:border-purple-500/50 focus:outline-none appearance-none cursor-pointer hover:bg-white/[0.05] transition-all"
                        >
                            <option value="all">Database Hierarchy</option>
                            <option value="events">Events Sub-System</option>
                            <option value="registrations">Registration Core</option>
                            <option value="sponsors">Partner Matrix</option>
                            <option value="admin_users">Personnel Access</option>
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 rotate-90 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.01] backdrop-blur-3xl shadow-2xl relative z-10">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/[0.03] text-gray-500 font-black uppercase tracking-[0.2em] text-[10px]">
                                <th className="px-8 py-6">Timestamp / Source</th>
                                <th className="px-8 py-6">Operator Identity</th>
                                <th className="px-8 py-6">Operation Code</th>
                                <th className="px-8 py-6">Data Mapping</th>
                                <th className="px-8 py-6">Evolution State (Delta)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-8 py-10">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-24 h-4 bg-white/5 rounded" />
                                                <div className="w-32 h-4 bg-white/5 rounded" />
                                                <div className="flex-1 h-4 bg-white/5 rounded" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-24 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-30">
                                            <Activity size={48} className="text-gray-500" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 italic">No log sequences detected in system memory</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group/row">
                                        <td className="px-8 py-8">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    <Clock size={12} className="text-purple-400" />
                                                    {format(new Date(log.created_at), 'MMM d')}
                                                </div>
                                                <div className="text-base font-mono text-white italic tracking-tighter">
                                                    {format(new Date(log.created_at), 'HH:mm:ss.SS')}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center text-purple-400 border border-white/5 shadow-lg group-hover/row:scale-110 transition-transform">
                                                    <User size={18} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-white italic tracking-tight">{log.user_email || 'ROOT_SYSTEM'}</span>
                                                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-0.5">AUTH_LEVEL: {log.user_id ? 'PERSONNEL' : 'CORE_ENGINE'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-[0.15em] shadow-lg ${
                                                log.action === 'INSERT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5' :
                                                log.action === 'UPDATE' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-indigo-500/5' :
                                                'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/5'
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                    log.action === 'INSERT' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' :
                                                    log.action === 'UPDATE' ? 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]' :
                                                    'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                                }`} />
                                                {log.action}
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-xs font-black text-gray-300 flex items-center gap-2 uppercase tracking-widest italic">
                                                    <Database size={12} className="text-gray-500" />
                                                    {log.table_name}
                                                </span>
                                                <span className="text-[10px] text-indigo-400/80 font-mono font-black uppercase tracking-widest">ID: {log.record_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8 min-w-[400px]">
                                            <div className="flex flex-col gap-4">
                                                <div className="relative">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Initial State</span>
                                                        <div className="h-[1px] flex-1 bg-white/5" />
                                                    </div>
                                                    {formatData(log.old_data)}
                                                </div>
                                                <div className="relative">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Successor State</span>
                                                        <div className="h-[1px] flex-1 bg-indigo-500/10" />
                                                        <ChevronRight size={10} className="text-indigo-500/40" />
                                                    </div>
                                                    {formatData(log.new_data)}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-8 py-6 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Ledger Stream Coverage</span>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mt-1">
                            <span className="text-white italic">{page * pageSize + 1}</span>
                            <span className="opacity-30">through</span>
                            <span className="text-white italic">{Math.min((page + 1) * pageSize, totalCount)}</span>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="opacity-30">total database events:</span>
                            <span className="text-indigo-400 tabular-nums">{totalCount.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            className="group relative flex items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:border-purple-500/50 transition-all disabled:opacity-20 disabled:pointer-events-none"
                        >
                            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <button
                            disabled={(page + 1) * pageSize >= totalCount}
                            onClick={() => setPage(p => p + 1)}
                            className="group relative flex items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:border-purple-500/50 transition-all disabled:opacity-20 disabled:pointer-events-none"
                        >
                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
