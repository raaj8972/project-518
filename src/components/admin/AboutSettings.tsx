import React, { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';

const sanitize = (html: string) => {
  try {
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  } catch {
    return html;
  }
};
import { useData } from '../../context/DataContext';
import { Plus, Trash, Save } from 'lucide-react';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { BRAND_YEAR } from '../../constants/brand';

export const AboutSettings: React.FC = () => {
  const { aboutSettings, updateAboutSettings } = useData();
  const savingProgress = useSavingProgress();

  const [enabled, setEnabled] = useState<boolean>(aboutSettings?.enabled ?? true);
  const [heroTitle, setHeroTitle] = useState<string>(aboutSettings?.hero_title ?? 'ABOUT RICORRENZA');
  const [heroHeading, setHeroHeading] = useState<string>(aboutSettings?.hero_heading ?? 'THE FUTURE IS NOW');
  const [paragraphs, setParagraphs] = useState<string[]>(aboutSettings?.hero_paragraphs ?? []);
  const [tracks, setTracks] = useState<string[]>(aboutSettings?.tracks ?? ['Healthcare Technology','Digital Arts & Media','Music','Interactive Experiences']);
  const [zones, setZones] = useState<string[]>(aboutSettings?.zones ?? ['Virtual Reality Labs','AI Demonstration Pods','Art Galleries','Future Tech Showcases']);
  const [tracksLabel, setTracksLabel] = useState<string>(aboutSettings?.tracksLabel ?? 'Innovation Tracks');
  const [zonesLabel, setZonesLabel] = useState<string>(aboutSettings?.zonesLabel ?? 'Experience Zones');
  const [stats, setStats] = useState<Array<{ value: string; label: string }>>(aboutSettings?.stats ?? [
    { value: BRAND_YEAR, label: 'FESTIVAL YEAR' },
    { value: '3+', label: 'DAYS OF EVENTS' },
    { value: '1000+', label: 'PARTICIPANTS' },
    { value: '∞', label: 'POSSIBILITIES' },
  ]);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const updatedAt = useMemo(() => aboutSettings?.updated_at ? new Date(aboutSettings.updated_at).toLocaleString() : null, [aboutSettings?.updated_at]);

  // Keep local form in sync when aboutSettings loads or changes
  React.useEffect(() => {
    if (!aboutSettings) return;
    setEnabled(aboutSettings.enabled ?? true);
    setHeroTitle(aboutSettings.hero_title ?? 'ABOUT RICORRENZA');
    setHeroHeading(aboutSettings.hero_heading ?? 'THE FUTURE IS NOW');
    setParagraphs(Array.isArray(aboutSettings.hero_paragraphs) ? aboutSettings.hero_paragraphs : []);
  setTracks(Array.isArray(aboutSettings.tracks) ? aboutSettings.tracks : []);
  setZones(Array.isArray(aboutSettings.zones) ? aboutSettings.zones : []);
  setTracksLabel(aboutSettings?.tracksLabel ?? 'Innovation Tracks');
  setZonesLabel(aboutSettings?.zonesLabel ?? 'Experience Zones');
    setStats(Array.isArray(aboutSettings.stats) ? aboutSettings.stats : []);
  }, [aboutSettings?.id, aboutSettings?.updated_at]);

  const addItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => setter(prev => [...prev, '']);
  const removeItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) => setter(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, val: string) => setter(prev => prev.map((v, i) => i === idx ? val : v));

  const addStat = () => setStats(prev => [...prev, { value: '', label: '' }]);
  const removeStat = (idx: number) => setStats(prev => prev.filter((_, i) => i !== idx));
  const updateStat = (idx: number, patch: Partial<{ value: string; label: string }>) => setStats(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));

  const onSave = async () => {
    setSaving(true);
    setSaveOk(null);
    setSaveErr(null);
    const steps = savingProgress.withSteps(4, 'Preparing…');
    try {
      steps.next('Sanitizing');
      await updateAboutSettings({
        enabled,
        hero_title: heroTitle,
        hero_heading: heroHeading,
        hero_paragraphs: paragraphs.filter(Boolean),
        tracks: tracks.filter(Boolean),
        zones: zones.filter(Boolean),
        tracksLabel,
        zonesLabel,
        stats: stats.filter(s => s.value || s.label),
      } as any);
      steps.next('Saving to database');
      steps.next('Finalizing');
      setSaveOk('Saved');
      steps.done();
    } finally {
      setSaving(false);
    }
  };

  const SaveStatus: React.FC = () => {
    if (saveErr) return <div className="text-sm text-red-600">{saveErr}</div>;
    if (saveOk) return <div className="text-sm text-green-600">{saveOk}</div>;
    return null;
  };

  // Wrap save in error handling
  const onSaveClick = async () => {
    try {
      await onSave();
    } catch (e: any) {
      const msg = e?.message || 'Failed to save About settings. Ensure migrations are applied (about_settings table exists).';
      setSaveErr(String(msg));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">About Section</h2>
        {updatedAt && <div className="text-xs text-gray-500">Last updated: {updatedAt}</div>}
      </div>

      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
            <input type="checkbox" className="rounded border-gray-300" checked={enabled} onChange={(e)=>setEnabled(e.target.checked)} />
            Enabled
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Title</label>
            <input value={heroTitle} onChange={(e)=>setHeroTitle(e.target.value)} className="w-full border rounded px-3 py-2 text-gray-900" placeholder="ABOUT RICORRENZA" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Heading</label>
            <input value={heroHeading} onChange={(e)=>setHeroHeading(e.target.value)} className="w-full border rounded px-3 py-2 text-gray-900" placeholder="THE FUTURE IS NOW" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Paragraphs</label>
          <div className="space-y-2">
            {paragraphs.map((p, i) => (
              <div key={i} className="flex gap-2">
                <textarea value={p} onChange={(e)=>updateItem(setParagraphs, i, e.target.value)} className="flex-1 border rounded px-3 py-2 text-gray-900" rows={3} placeholder="Enter paragraph..." />
                <button className="p-2 text-red-600" onClick={()=>removeItem(setParagraphs, i)} title="Remove">
                  <Trash className="w-5 h-5" />
                </button>
              </div>
            ))}
            <button className="inline-flex items-center gap-2 text-sm text-blue-600" onClick={()=>addItem(setParagraphs)}>
              <Plus className="w-4 h-4" /> Add paragraph
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section Name</label>
            <input value={tracksLabel} onChange={e => setTracksLabel(e.target.value)} className="w-full border rounded px-3 py-2 mb-2 text-gray-900" placeholder="Innovation Tracks" />
            <div className="space-y-2">
              {tracks.map((t, i) => (
                <div key={i} className="flex gap-2">
                  <input value={t} onChange={(e)=>updateItem(setTracks, i, e.target.value)} className="flex-1 border rounded px-3 py-2 text-gray-900" placeholder="Track name" />
                  <button className="p-2 text-red-600" onClick={()=>removeItem(setTracks, i)} title="Remove">
                    <Trash className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button className="inline-flex items-center gap-2 text-sm text-blue-600" onClick={()=>addItem(setTracks)}>
                <Plus className="w-4 h-4" /> Add track
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section Name</label>
            <input value={zonesLabel} onChange={e => setZonesLabel(e.target.value)} className="w-full border rounded px-3 py-2 mb-2 text-gray-900" placeholder="Experience Zones" />
            <div className="space-y-2">
              {zones.map((z, i) => (
                <div key={i} className="flex gap-2">
                  <input value={z} onChange={(e)=>updateItem(setZones, i, e.target.value)} className="flex-1 border rounded px-3 py-2 text-gray-900" placeholder="Zone name" />
                  <button className="p-2 text-red-600" onClick={()=>removeItem(setZones, i)} title="Remove">
                    <Trash className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button className="inline-flex items-center gap-2 text-sm text-blue-600" onClick={()=>addItem(setZones)}>
                <Plus className="w-4 h-4" /> Add zone
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Stats</label>
          <div className="space-y-2">
            {stats.map((s, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                <input value={s.value} onChange={(e)=>updateStat(i, { value: e.target.value })} className="border rounded px-3 py-2 text-gray-900" placeholder="Value (e.g., 2025)" />
                <input value={s.label} onChange={(e)=>updateStat(i, { label: e.target.value })} className="border rounded px-3 py-2 md:col-span-2 text-gray-900" placeholder="Label (e.g., FESTIVAL YEAR)" />
                <button className="p-2 text-red-600" onClick={()=>removeStat(i)} title="Remove"><Trash className="w-5 h-5" /></button>
              </div>
            ))}
            <button className="inline-flex items-center gap-2 text-sm text-blue-600" onClick={addStat}>
              <Plus className="w-4 h-4" /> Add stat
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="mt-6 p-4 border rounded-lg bg-gray-50">
          <div className="text-sm font-semibold text-gray-700 mb-3">Live Preview</div>
          {enabled === false && (
            <div className="text-xs text-red-600 mb-2">Note: About section is disabled and will not show on Home.</div>
          )}
          <div className="prose prose-invert max-w-none">
            <h2 className="text-xl font-bold">{heroTitle || 'ABOUT RICORRENZA'}</h2>
            <h3 className="text-lg font-semibold text-gray-800">{heroHeading || 'THE FUTURE IS NOW'}</h3>
            <div className="space-y-2 text-gray-700">
              {(paragraphs.length ? paragraphs : ['']).map((p, i) => (
                <p key={i} dangerouslySetInnerHTML={{ __html: sanitize(p) }} />
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">{tracksLabel || 'Innovation Tracks'}</div>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {(tracks.length ? tracks : ['']).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">{zonesLabel || 'Experience Zones'}</div>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {(zones.length ? zones : ['']).map((z, i) => (
                    <li key={i}>{z}</li>
                  ))}
                </ul>
              </div>
            </div>
            {stats.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {stats.map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-lg font-bold">{s.value || '—'}</div>
                    <div className="text-xs text-gray-600">{s.label || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <SaveStatus />
          <button onClick={onSaveClick} disabled={saving} className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-4 py-2 rounded-md disabled:opacity-60">
            <Save className="w-5 h-5" /> {saving ? 'Saving…' : 'Save About'}
          </button>
        </div>
      </div>
    </div>
  );
};
