import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { History, Search, ArrowLeft, ArrowRight, User, Database, Clock } from 'lucide-react';
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
        if (!data) return '-';
        if (typeof data === 'object') return <pre className="text-[10px] max-h-24 overflow-auto bg-black/20 p-2 rounded">{JSON.stringify(data, null, 2)}</pre>;
        return String(data);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <History className="text-purple-400" />
                        System Audit Logs
                    </h2>
                    <p className="text-gray-400 text-sm">Track every administrative action and data change.</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <input
                            type="text"
                            placeholder="Search email, action..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 pl-10 text-sm text-white focus:border-purple-500 focus:outline-none transition-colors"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    </div>
                    <select
                        value={tableFilter}
                        onChange={(e) => setTableFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none"
                    >
                        <option value="all">All Tables</option>
                        <option value="events">Events</option>
                        <option value="registrations">Registrations</option>
                        <option value="sponsors">Sponsors</option>
                        <option value="admin_users">Admin Users</option>
                    </select>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-widest border-b border-white/10">
                                <th className="px-6 py-4 font-semibold">Time</th>
                                <th className="px-6 py-4 font-semibold">User</th>
                                <th className="px-6 py-4 font-semibold">Action</th>
                                <th className="px-6 py-4 font-semibold">Table / ID</th>
                                <th className="px-6 py-4 font-semibold">Changes (Old → New)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8 h-12 bg-white/5"></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No audit logs found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Clock size={12} />
                                                {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
                                                    <User size={12} />
                                                </div>
                                                <span className="text-sm font-medium text-white">{log.user_email || 'System'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                log.action === 'INSERT' ? 'bg-green-500/10 text-green-400' :
                                                log.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-400' :
                                                'bg-red-500/10 text-red-400'
                                            }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-300 flex items-center gap-1">
                                                    <Database size={12} className="text-gray-500" />
                                                    {log.table_name}
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-mono">ID: {log.record_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 min-w-[300px]">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-tighter">Previous</p>
                                                    {formatData(log.old_data)}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-tighter">Current</p>
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
                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                        Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} logs
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <button
                            disabled={(page + 1) * pageSize >= totalCount}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                        >
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
