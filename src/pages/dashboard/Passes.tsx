import React from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { QrCode } from 'lucide-react';
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">My Festival Pass</h1>
        <p className="text-gray-400">Access tokens for entrance and individual events.</p>
      </div>

      {dataLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map(i => (
            <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse border border-white/10" />
          ))}
        </div>
      ) : entryPasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {entryPasses.map((pass) => (
            <EntryPass
              key={pass.id}
              pass={pass}
              onClick={() => setSelectedPass(pass)}
            />
          ))}
        </div>
      ) : (
        <div className="rico-glass-card p-12 rounded-3xl border border-white/10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
            <QrCode className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Active Passes</h3>
          <p className="text-gray-400 max-w-sm">
            Once you register for events or your general entry is approved, your digital passes will appear here.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default Passes;
