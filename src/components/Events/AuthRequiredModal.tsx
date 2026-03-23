import React from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  eventTitle: string;
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  eventTitle
}) => {
  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />
        
        {/* Modal Content */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-[#0d0d0d] border border-red-500/20 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.15)] overflow-hidden flex flex-col"
        >
          {/* Decorative Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-600/10 blur-[80px] rounded-full pointer-events-none" />

          {/* Header */}
          <div className="p-6 pb-0 flex justify-end">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="px-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500 mb-6 border border-red-500/20">
              <UserPlus size={32} />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight leading-tight">
              Registration Required
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              To register for <span className="text-red-400 font-semibold">{eventTitle}</span>, you need to have a student account. Please sign up or log in to continue.
            </p>

            <div className="space-y-3">
              <button 
                onClick={onConfirm}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(220,38,38,0.3)] flex items-center justify-center gap-2 group"
              >
                <LogIn size={18} className="group-hover:translate-x-0.5 transition-transform" />
                Sign Up / Log In
              </button>
              
              <button 
                onClick={onClose}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl transition-all active:scale-[0.98] border border-white/10"
              >
                Maybe Later
              </button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="px-8 py-4 bg-red-950/10 border-t border-red-900/10 flex items-center justify-center gap-2">
            <AlertCircle size={14} className="text-red-500/70" />
            <p className="text-[11px] text-gray-500 uppercase tracking-widest font-bold">
              Account Approval may be required
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
