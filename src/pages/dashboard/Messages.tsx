import React from 'react';
import { motion } from 'framer-motion';
import { ChatPanel } from '../../components/shared/ChatPanel';

const Messages: React.FC = () => {
  return (
    <motion.div
      key="messages"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="h-[calc(100vh-16rem)] min-h-[500px]"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Coordinator Chat</h1>
        <p className="text-gray-400">Direct channel to festival coordinators and technical support.</p>
      </div>
      <div className="h-full rounded-3xl overflow-hidden border border-white/10 bg-white/5">
        <ChatPanel />
      </div>
    </motion.div>
  );
};

export default Messages;
