import React from 'react';
import { motion } from 'framer-motion';
import { AnnouncementsPanel } from '../../components/shared/AnnouncementsPanel';

const Announcements: React.FC = () => {
  return (
    <motion.div
      key="announcements"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-4xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Announcements</h1>
        <p className="text-gray-400">Official updates and important notices for {new Date().getFullYear()}.</p>
      </div>
      <AnnouncementsPanel mode="student" />
    </motion.div>
  );
};

export default Announcements;
