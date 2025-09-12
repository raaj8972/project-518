import React from 'react';

interface FacultyProfileModalProps {
  open: boolean;
  onClose: () => void;
  person?: {
    name: string;
    title?: string;
    image?: string;
    description?: string;
    specialty?: string;
    achievements?: string[];
    social_links?: Partial<Record<'instagram' | 'youtube' | 'spotify' | 'twitter' | 'linkedin', string>>;
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
          {person.description && <p className="text-gray-300 leading-relaxed mb-4 whitespace-pre-line">{person.description}</p>}
          {person.achievements && person.achievements.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-cyan-400 mb-2">Achievements</h4>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                {person.achievements.map((a, i) => (<li key={i}>{a}</li>))}
              </ul>
            </div>
          )}
          {person.social_links && Object.values(person.social_links).some(Boolean) && (
            <div className="flex gap-3 mt-2">
              {Object.entries(person.social_links).map(([k, v]) => v && (
                <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-100 text-sm underline">
                  {k}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyProfileModal;
