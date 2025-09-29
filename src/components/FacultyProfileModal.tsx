import React from 'react';
// Instagram replaced by text pill labeled 'Social'
import Instagram3DButtonLink from './Instagram3DButtonLink';
import YouTube3DButtonLink from './YouTube3DButtonLink';
import Facebook3DButtonLink from './Facebook3DButtonLink';
import Email3DButtonLink from './Email3DButtonLink';
import Phone3DButtonLink from './Phone3DButtonLink';

interface FacultyProfileModalProps {
  open: boolean;
  onClose: () => void;
  person?: {
    name: string;
    title?: string;
    image?: string;
    description?: string;
    specialty?: string;
    email?: string;
    phone?: string;
    achievements?: string[];
    social_links?: Partial<Record<'instagram' | 'youtube' | 'spotify' | 'twitter' | 'linkedin', string>>;
  } | null;
}

const FacultyProfileModal: React.FC<FacultyProfileModalProps> = ({ open, onClose, person }) => {
  if (!open || !person) return null;

  const extractHandle = (platform: string, url: string): string | null => {
    try {
      const u = new URL(url);
      const path = u.pathname.replace(/\/$/, '');
      if (platform === 'instagram') {
        // instagram.com/<user>
        const seg = path.split('/').filter(Boolean).pop();
        if (!seg) return null;
        return seg.startsWith('@') ? seg : `@${seg}`;
      }
      if (platform === 'youtube') {
        // Prefer @handle if present
        const atMatch = path.match(/\/(@[^/]+)/);
        if (atMatch) return atMatch[1];
        // Otherwise last path segment for /c/<name> or generic
        const seg = path.split('/').filter(Boolean).pop();
        if (!seg) return null;
        if (seg.toLowerCase() === 'channel') return null; // channel/<id> – not a human handle
        return seg.startsWith('@') ? seg : `@${seg}`;
      }
      return null;
    } catch {
      return null;
    }
  };

  

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
          {(person.email || person.phone) && (
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-cyan-400">Contact:</span>
                {person.email && (
                  <Email3DButtonLink href={`mailto:${person.email}`} iconSize={34} buttonSize={54} ariaLabel={`Email ${person.name}`} />
                )}
                {person.phone && (
                  <Phone3DButtonLink href={`tel:${person.phone}`} iconSize={32} buttonSize={52} ariaLabel={`Call ${person.name}`} />
                )}
              </div>
            </div>
          )}
          {person.achievements && person.achievements.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-cyan-400 mb-2">Achievements</h4>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                {person.achievements.map((a, i) => (<li key={i}>{a}</li>))}
              </ul>
            </div>
          )}
          {person.social_links && Object.values(person.social_links).some(Boolean) && (
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <span className="text-sm font-semibold text-cyan-400">Social Media:</span>
              {Object.entries(person.social_links).map(([k, v]) => {
                if (!v) return null;
                if (k.toLowerCase() === 'instagram') {
                  const handle = extractHandle('instagram', v);
                  return (
                    <span key={k} className="inline-flex items-center gap-2">
                      <Instagram3DButtonLink href={v} iconSize={32} buttonSize={48} />
                      {handle && (
                        <a href={v} target="_blank" rel="noopener noreferrer" className="text-sm text-pink-300 hover:text-pink-200">
                          {handle}
                        </a>
                      )}
                    </span>
                  );
                }
                if (k.toLowerCase() === 'youtube') {
                  const handle = extractHandle('youtube', v);
                  return (
                    <span key={k} className="inline-flex items-center gap-2">
                      <YouTube3DButtonLink href={v} iconSize={32} buttonSize={48} ariaLabel="YouTube channel" />
                      {handle && (
                        <a href={v} target="_blank" rel="noopener noreferrer" className="text-sm text-red-300 hover:text-red-200">
                          {handle}
                        </a>
                      )}
                    </span>
                  );
                }
                if (k.toLowerCase() === 'facebook') {
                  // Render only the 3D Facebook icon (no text label) to avoid wrapping and alignment issues on small screens
                  return (
                    <Facebook3DButtonLink key={k} href={v} iconSize={32} buttonSize={48} ariaLabel="Facebook profile" />
                  );
                }
                return (
                  <a
                    key={k}
                    href={v}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-300 hover:text-cyan-100 text-sm underline capitalize"
                  >
                    {k}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
};

export default FacultyProfileModal;
