import React from 'react';
import { createPortal } from 'react-dom';
import { X, FileText } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  rules: any[];
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  eventTitle,
  rules
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-red-900/30 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-red-900/20 bg-gradient-to-r from-red-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600/10 rounded-lg text-red-500">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">{eventTitle}</h2>
              <p className="text-sm text-red-500/70 font-medium">Event Rules & Guidelines</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
          {rules.map((item, idx) => {
            switch (item.level) {
              case 'h1':
                return (
                  <h3 key={idx} className="text-lg font-bold text-red-500 uppercase tracking-wider pb-2 border-b border-red-900/10 pt-4 first:pt-0">
                    {item.content}
                  </h3>
                );
              case 'h2':
                return (
                  <h4 key={idx} className="text-md font-semibold text-gray-200 pt-2">
                    {item.content}
                  </h4>
                );
              case 'numbered':
                return (
                  <div key={idx} className="flex gap-4 group">
                    <span className="text-red-600 font-mono font-bold pt-0.5 text-sm">{item.index}.</span>
                    <p className="text-gray-300 leading-relaxed text-sm group-hover:text-white transition-colors">
                      {item.content}
                    </p>
                  </div>
                );
              case 'bullet':
                return (
                  <div key={idx} className="flex gap-4 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2 flex-shrink-0 group-hover:scale-125 transition-transform" />
                    <p className="text-gray-300 leading-relaxed text-sm group-hover:text-white transition-colors">
                      {item.content}
                    </p>
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-red-900/20 bg-red-950/5 flex items-center justify-between gap-4">
          <p className="text-xs text-gray-500 italic">
            * Please follow these rules carefully for a fair competition.
          </p>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg transition-all active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
