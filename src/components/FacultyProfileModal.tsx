import React from 'react';
import { ProfileContactLinks } from './RicoFamily/ProfileContactLinks';
import { personBatch } from '../utils/familyPeople';

interface FacultyProfileModalProps {
  open: boolean;
  onClose: () => void;
  person?: {
    name: string;
    title?: string;
    image?: string;
    specialty?: string;
    email?: string;
    phone?: string;
    social_links?: Partial<Record<'instagram' | 'facebook' | 'youtube' | 'spotify' | 'twitter' | 'linkedin' | 'batch', string>>;

  } | null;
}

const FacultyProfileModal: React.FC<FacultyProfileModalProps> = ({ open, onClose, person }) => {
  if (!open || !person) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f1220] border border-cyan-500/30 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          {/* Image area: contain to show full picture without cropping */}
          <div className="w-full bg-black/30 flex items-center justify-center">
            <img
              src={person.image}
              alt={person.name}
              className="max-h-[50vh] w-auto object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
          <button onClick={onClose} className="absolute top-3 right-3 bg-black/60 text-white rounded-full w-9 h-9">✕</button>
        </div>
        <div className="p-6">
          <h3 className="text-2xl font-bold text-white mb-1">{person.name}</h3>
          {person.title && <div className="text-cyan-400 mb-4">{person.title}</div>}
          {person.specialty && (
            <div className="inline-block bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs px-3 py-1 rounded-full mb-4">{person.specialty}</div>
          )}
        

          {personBatch(person) && <p className="family-profile-batch">Batch {personBatch(person)}</p>}
          <ProfileContactLinks name={person.name} instagram={person.social_links?.instagram} facebook={person.social_links?.facebook} phone={person.phone} showPhone showFacebook />
        </div>
      </div>
      
    </div>
  );
};

export default FacultyProfileModal;
