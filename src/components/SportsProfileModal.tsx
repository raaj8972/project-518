import React from 'react';
import Instagram3DButtonLink from './Instagram3DButtonLink';
import YouTube3DButtonLink from './YouTube3DButtonLink';
import Email3DButtonLink from './Email3DButtonLink';
import Phone3DButtonLink from './Phone3DButtonLink';

export interface SportsPerson {
  id?: number;
  name: string;
  role?: string;
  image?: string;
  description?: string;
  achievements?: string[];
  email?: string | null;
  phone?: string | null;
  social_links?: Partial<Record<'instagram' | 'youtube' | 'twitter' | 'linkedin', string>> | null;
}

interface SportsProfileModalProps {
  open: boolean;
  onClose: () => void;
  person?: SportsPerson | null;
}

const SportsProfileModal: React.FC<SportsProfileModalProps> = ({ open, onClose, person }) => {
  if (!open || !person) return null;

  const extractInstaHandle = (url: string): string | null => {
    try {
      const u = new URL(url);
      const seg = u.pathname.replace(/\/$/, '').split('/').filter(Boolean).pop();
      if (!seg) return null;
      return seg.startsWith('@') ? seg : `@${seg}`;
    } catch { return null; }
  };

  const extractYouTubeHandle = (url: string): string | null => {
    try {
      const u = new URL(url);
      const at = u.pathname.match(/\/(@[^/]+)/);
      if (at) return at[1];
      const seg = u.pathname.replace(/\/$/, '').split('/').filter(Boolean).pop();
      if (!seg || seg.toLowerCase() === 'channel') return null;
      return seg.startsWith('@') ? seg : `@${seg}`;
    } catch { return null; }
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f1220] border border-green-500/30 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <div className="w-full bg-black/30 flex items-center justify-center">
            {person.image && (
              <img src={person.image} alt={person.name} className="max-h-[50vh] w-auto object-contain" loading="lazy" decoding="async" />
            )}
          </div>
          <button onClick={onClose} className="absolute top-3 right-3 bg-black/60 text-white rounded-full w-9 h-9">✕</button>
        </div>
        <div className="p-6">
          <h3 className="text-2xl font-bold text-white mb-1">{person.name}</h3>
          {person.role && <div className="text-green-400 mb-4">{person.role}</div>}
          {person.description && <p className="text-gray-300 leading-relaxed mb-4 whitespace-pre-line">{person.description}</p>}
          {person.achievements && person.achievements.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-green-400 mb-2">Achievements</h4>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                {person.achievements.map((a, i) => (<li key={i}>{a}</li>))}
              </ul>
            </div>
          )}
          {(person.email || person.phone) && (
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-green-400">Contact:</span>
                {person.email && (
                  <Email3DButtonLink href={`mailto:${person.email}`} iconSize={34} buttonSize={54} ariaLabel={`Email ${person.name}`} />
                )}
                {person.phone && (
                  <Phone3DButtonLink href={`tel:${person.phone}`} iconSize={32} buttonSize={52} ariaLabel={`Call ${person.name}`} />
                )}
              </div>
            </div>
          )}
          {person.social_links && Object.values(person.social_links).some(Boolean) && (
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <span className="text-sm font-semibold text-green-400">Social:</span>
              {Object.entries(person.social_links).map(([k, v]) => {
                if (!v) return null;
                if (k.toLowerCase() === 'instagram') {
                  const handle = extractInstaHandle(v);
                  return (
                    <span key={k} className="inline-flex items-center gap-2">
                      <Instagram3DButtonLink href={v} iconSize={32} buttonSize={48} />
                      {handle && (
                        <a href={v} target="_blank" rel="noopener noreferrer" className="text-sm text-pink-300 hover:text-pink-200">{handle}</a>
                      )}
                    </span>
                  );
                }
                if (k.toLowerCase() === 'youtube') {
                  const handle = extractYouTubeHandle(v);
                  return (
                    <span key={k} className="inline-flex items-center gap-2">
                      <YouTube3DButtonLink href={v} iconSize={32} buttonSize={48} />
                      {handle && (
                        <a href={v} target="_blank" rel="noopener noreferrer" className="text-sm text-red-300 hover:text-red-200">{handle}</a>
                      )}
                    </span>
                  );
                }
                return (
                  <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="text-green-300 hover:text-green-100 text-sm underline capitalize">{k}</a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SportsProfileModal;
