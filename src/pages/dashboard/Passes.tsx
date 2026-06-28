import React from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { QrCode, Ticket, Zap } from 'lucide-react';
import EntryPass from '../../components/dashboard/EntryPass';

interface DashboardContextType {
  entryPasses: any[];
  setSelectedPass: (pass: any) => void;
  dataLoading: boolean;
}

const Passes: React.FC = () => {
  const { entryPasses, setSelectedPass, dataLoading } = useOutletContext<DashboardContextType>();

  return (
    <motion.div
      key="passes"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="neu-card p-6 rounded-2xl">
        <p className="text-[11px] font-black text-gray-600 uppercase tracking-widest mb-1">Digital Access</p>
        <h1 className="text-2xl font-black text-white tracking-tight mb-1">My Festival Pass</h1>
        <p className="text-gray-600 text-sm">Tap any pass to open your digital wallet entry.</p>
      </div>

      {/* Status strip */}
      {!dataLoading && entryPasses.length > 0 && (
        <div className="neu-inset rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-black text-white">{entryPasses.length} Active {entryPasses.length === 1 ? 'Pass' : 'Passes'}</p>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Ready to scan</p>
          </div>
          <div className="ml-auto w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
        </div>
      )}

      {dataLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[0, 1].map(i => (
            <div key={i} className="neu-card rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      ) : entryPasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {entryPasses.map((pass, idx) => (
            <motion.div
              key={pass.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.3 }}
              className="neu-card rounded-2xl overflow-hidden cursor-pointer hover:shadow-[0_0_24px_rgba(99,102,241,0.2)] transition-all duration-300"
              onClick={() => setSelectedPass(pass)}
            >
              <EntryPass
                pass={pass}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="neu-card p-16 rounded-2xl flex flex-col items-center text-center">
          <div className="neu-icon-btn w-16 h-16 flex items-center justify-center mb-6">
            <QrCode className="w-7 h-7 text-gray-600" />
          </div>
          <h3 className="text-xl font-black text-white mb-2 tracking-tight">No Active Passes</h3>
          <p className="text-gray-600 max-w-sm text-sm leading-relaxed">
            Once you register for events or your general entry is approved, your digital passes will appear here.
          </p>
          <div className="mt-8 flex items-center gap-2 text-gray-700 text-[11px] font-black uppercase tracking-widest">
            <Ticket className="w-4 h-4" />
            <span>Passes are auto-generated after approval</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Passes;
