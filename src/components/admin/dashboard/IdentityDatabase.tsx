import React from 'react';
import { Clock, Hash, ArrowRight } from 'lucide-react';

interface UserIdentity {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  status: 'active' | 'pending' | 'blocked' | 'admin';
}

interface IdentityDatabaseProps {
  users: UserIdentity[];
  title?: string;
}

export const IdentityDatabase: React.FC<IdentityDatabaseProps> = ({ users, title = "Identity Database" }) => {
  return (
    <div className="hyper-glass rounded-[2rem] p-4 sm:p-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative z-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
              <Hash size={20} className="text-white/40" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tighter">{title}</h3>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Neural Logs: V1.0.4</p>
            </div>
          </div>
          <button className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all">
            Full Archive
          </button>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-left text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">ID</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Date & Timestamp</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Identity signature</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Access Matrix</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Directives</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {users.map((user, idx) => (
                <tr key={user.id} className="group/row hover:bg-white/[0.02] transition-all duration-500">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-[11px] font-black text-white/20 font-mono tracking-tighter uppercase">RICO_{idx + 104}</span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Clock size={12} className="text-white/20" />
                      <span className="text-[11px] font-bold text-white/60 tracking-tight">
                        {new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-white/5 flex items-center justify-center text-[10px] font-black text-indigo-400">
                        {user.name?.[0].toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-[13px] font-black text-white tracking-tight leading-none mb-1">{user.name}</p>
                        <p className="text-[10px] font-bold text-white/20 tracking-tight leading-none">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className={`
                      inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest
                      ${user.status === 'admin' 
                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}
                    `}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'admin' ? 'bg-indigo-500' : 'bg-emerald-500'} animate-pulse`} />
                      {user.status}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right">
                    <button className="flex items-center gap-2 text-[10px] font-black text-white/40 group-hover/row:text-white transition-all uppercase tracking-widest">
                      Protocol <ArrowRight size={12} className="group-hover/row:translate-x-1 transition-transform" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
