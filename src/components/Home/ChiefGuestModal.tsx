import React, { startTransition } from 'react';
import { X as XIcon, Instagram, Youtube, Music2 } from 'lucide-react';

interface ChiefGuest {
  id: string;
  name: string;
  image: string;
  title?: string;
  specialty?: string;
  description?: string;
  achievements?: string[];
  social_links?: {
    instagram?: string;
    youtube?: string;
    spotify?: string;
  };
}

interface ChiefGuestModalProps {
  isOpen: boolean;
  selectedChiefGuest: ChiefGuest | null;
  onClose: () => void;
}

const PreserveNewlines: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  return (
    <div className={className}>
      {text.split('\n').map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i !== text.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );
};

const ChiefGuestModal: React.FC<ChiefGuestModalProps> = ({
  isOpen,
  selectedChiefGuest,
  onClose
}) => {
  if (!isOpen || !selectedChiefGuest) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-gradient-to-br from-red-950/90 via-black/80 to-orange-950/90 ring-1 ring-red-500/30 shadow-2xl flex flex-col">
        <div className="flex items-start gap-4 p-5 border-b border-white/10">
          <div className="relative w-24 h-24 sm:w-40 sm:h-40 rounded-xl overflow-hidden ring-1 ring-red-400/40 flex-shrink-0">
            <img loading="lazy" decoding="async" src={selectedChiefGuest.image} alt={selectedChiefGuest.name} className="w-full h-full object-cover" />
            {selectedChiefGuest.specialty && (
              <div className="absolute bottom-2 left-2 bg-gradient-to-r from-red-500 to-orange-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping opacity-70" />
                <span>{selectedChiefGuest.specialty}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide mb-1">{selectedChiefGuest.name}</h3>
            {selectedChiefGuest.title && <p className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-red-300 to-orange-300 bg-clip-text text-transparent mb-3">{selectedChiefGuest.title}</p>}
            {selectedChiefGuest.description && (
              <PreserveNewlines text={selectedChiefGuest.description} className="text-gray-300 text-xs sm:text-sm leading-relaxed line-clamp-4 overflow-y-auto max-h-32 custom-scrollbar" />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-2 text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition flex-shrink-0"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar space-y-6">
          {selectedChiefGuest.achievements && selectedChiefGuest.achievements.length > 0 && (
            <div>
              <h4 className="uppercase text-[11px] tracking-wider font-bold text-red-500 mb-2">All Highlights</h4>
              <ul className="space-y-1.5 text-xs text-gray-300 list-disc list-inside">
                {selectedChiefGuest.achievements.map((a, i) => (<li key={i}>{a}</li>))}
              </ul>
            </div>
          )}
          {(selectedChiefGuest.social_links?.instagram || selectedChiefGuest.social_links?.youtube || selectedChiefGuest.social_links?.spotify) && (
            <div>
              <h4 className="uppercase text-[11px] tracking-wider font-bold text-red-500 mb-2">Connect</h4>
              <div className="flex flex-wrap gap-3">
                {selectedChiefGuest.social_links?.instagram && (
                  <a href={selectedChiefGuest.social_links.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-pink-600/70 hover:bg-pink-600 text-white transition-colors">
                    <Instagram className="w-4 h-4" /> Instagram
                  </a>
                )}
                {selectedChiefGuest.social_links?.youtube && (
                  <a href={selectedChiefGuest.social_links.youtube} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-600/70 hover:bg-red-600 text-white transition-colors">
                    <Youtube className="w-4 h-4" /> YouTube
                  </a>
                )}
                {selectedChiefGuest.social_links?.spotify && (
                  <a href={selectedChiefGuest.social_links.spotify} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-600/70 hover:bg-green-600 text-white transition-colors">
                    <Music2 className="w-4 h-4" /> Spotify
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChiefGuestModal;
