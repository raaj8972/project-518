import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import ParticipantCarousel from '../../components/dashboard/ParticipantCarousel';

const SocialFeed: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12 pb-20"
    >
      {/* RICO STARS - The Spotlight */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
              <Star className="w-8 h-8 text-yellow-500 fill-yellow-500/20" />
              RICO STARS
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-bold uppercase tracking-widest">
              The top legends and rising stars of RICO Fest
            </p>
          </div>
        </div>
        
        {/* We will render our redesigned ParticipantCarousel directly here */}
        <div className="relative">
          <ParticipantCarousel />
        </div>
      </section>
    </motion.div>
  );
};

export default SocialFeed;
