import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, MessageSquare, Calendar, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FloatingActionHubProps {
  onViewPass: () => void;
  onOpenChat: () => void;
}

const FloatingActionHub: React.FC<FloatingActionHubProps> = ({ onViewPass, onOpenChat }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { icon: QrCode, label: 'My Pass', color: 'bg-red-600 shadow-red-600/30', action: onViewPass },
    { icon: MessageSquare, label: 'Chat', color: 'bg-orange-600 shadow-orange-600/30', action: () => { setIsOpen(false); onOpenChat(); } },
    { icon: Calendar, label: 'Events', color: 'bg-white/10 shadow-white/5', action: () => { setIsOpen(false); navigate('/events'); } },
  ];

  return (
    /* only visible on mobile */
    <div className="md:hidden fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && actions.map((action, idx) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ delay: idx * 0.06, type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => { setIsOpen(false); action.action(); }}
            className={`flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-2xl text-white text-sm font-semibold shadow-lg ${action.color} backdrop-blur-xl border border-white/10 active:scale-95 transition-transform`}
          >
            <action.icon size={18} />
            {action.label}
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Main toggle button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        className="w-14 h-14 bg-red-600 hover:bg-red-500 rounded-2xl flex items-center justify-center shadow-xl shadow-red-600/40 border border-red-400/20 transition-colors"
      >
        {isOpen ? <X size={24} className="text-white" /> : <Plus size={24} className="text-white" />}
      </motion.button>
    </div>
  );
};

export default FloatingActionHub;
