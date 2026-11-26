import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, ImageIcon, PlusIcon } from '@radix-ui/react-icons';
import type { RoadmapMilestone } from '../../../types/data';
import { DEFAULT_ROADMAP, isHomepageRoadmapVisible, mergeRoadmapDrafts, nextRoadmapYear, type RoadmapEdits, type RoadmapItemDraft } from '../../../utils/homepageRoadmap';
import { StudioField, StudioGroup, StudioToggle } from './StudioControls';
import type { HomepageDraft, HomepageDraftSetter } from './homepageForm';
import { RoadmapPhotoEditor } from '../RoadmapPhotoEditor';
import '../../../styles/ChroniclesEditor.css';

interface Props {
  records: RoadmapMilestone[];
  edits: RoadmapEdits;
  setEdits: Dispatch<SetStateAction<RoadmapEdits>>;
  form: HomepageDraft;
  setForm: HomepageDraftSetter;
  onProcessingChange?: (busy: boolean) => void;
}

export function HomepageRoadmapEditor({ records, edits, setEdits, form, setForm, onProcessingChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState('');
  const processing = useCallback((value: boolean) => { setBusy(value); onProcessingChange?.(value); }, [onProcessingChange]);
  const all = mergeRoadmapDrafts(records, edits);
  const current = all.find(item => item.key === selected) || all[0];
  const position = current ? all.indexOf(current) : -1;
  const nextYear = nextRoadmapYear(all.length ? all : DEFAULT_ROADMAP);
  const edit = (patch: Partial<RoadmapItemDraft>) => {
    if (current) setEdits(previous => ({ ...previous, [current.key]: { ...current, ...previous[current.key], ...patch } }));
  };
  const add = () => {
    if (nextYear == null) return;
    const key = `new-milestone-${crypto.randomUUID()}`;
    setEdits(previous => ({ ...previous, [key]: { key, year: nextYear, title: '', points: [], images: [], enabled: true, order_position: Math.max(0, ...all.map(item => item.order_position)) + 1, side: 'auto' } }));
    setSelected(key);
  };
  const importDefaults = () => setEdits(previous => ({ ...previous, ...Object.fromEntries(DEFAULT_ROADMAP.filter(item => !all.some(record => record.year === item.year)).map((item, index) => {
    const key = `default-${item.year}`;
    return [key, { ...item, key, enabled: true, order_position: Math.max(0, ...all.map(record => record.order_position)) + index + 1 }];
  })) }));
  const move = (direction: number) => {
    if (!current || position + direction < 0 || position + direction >= all.length) return;
    const ordered = all.slice();
    ordered.splice(position, 1);
    ordered.splice(position + direction, 0, current);
    setEdits(previous => ({ ...previous, ...Object.fromEntries(ordered.map((item, index) => [item.key, { ...item, order_position: index + 1 }])) }));
  };
  const invalidYear = current && (!Number.isInteger(current.year) || current.year < 1900 || current.year > 3000 || all.some(item => item.key !== current.key && item.year === current.year));

  return <div className="chronicles-editor">
    <section className="chronicles-overview" aria-label="Chronicles overview">
      <div className="chronicles-counts"><span><CalendarIcon /><strong>{all.length}</strong> editions</span><span><ImageIcon /><strong>{all.reduce((sum, item) => sum + item.images.length, 0)}</strong> photos</span><span className="chronicles-published">{all.filter(item => item.enabled).length} visible</span></div>
      <StudioToggle label="Show Chronicles on homepage" description="Publish your festival’s story on the timeline." checked={isHomepageRoadmapVisible(form.roadmap_enabled)} onChange={enabled => setForm(previous => ({ ...previous, roadmap_enabled: enabled }))} />
    </section>
    <section className="chronicles-editions" aria-label="Festival editions">
      <header><div><h3>Your editions</h3><p>Select a year to edit. The website shows the latest edition first.</p></div><button type="button" className="studio-button studio-button-primary" disabled={busy || nextYear == null} onClick={add}><PlusIcon />Add year</button></header>
      {all.length > 0 && <div className="chronicles-year-list">{all.map(item => <button type="button" key={item.key} disabled={busy} aria-label={`Edit ${item.year} milestone`} aria-pressed={current?.key === item.key} onClick={() => setSelected(item.key)}><span>{item.year}{edits[item.key] && <i aria-label="Unsaved milestone" />}</span><small>{item.enabled ? `${item.images.length} photos` : 'Hidden'}</small></button>)}</div>}
      {!records.length && !all.length && <div className="chronicles-empty"><CalendarIcon /><h4>Bring your festival history together</h4><p>The website currently uses the built-in history. Copy it here to start editing, or add your first year.</p><button type="button" className="studio-button studio-button-secondary" disabled={busy} onClick={importDefaults}>Copy default history</button></div>}
      {all.length > 0 && <details className="chronicles-import"><summary>Missing an earlier edition?</summary><p>Add a year using the button above, or copy any missing years from the original festival history.</p><button type="button" className="studio-text-button" disabled={busy} onClick={importDefaults}>Add missing default years</button></details>}
    </section>
    {current && <fieldset className="chronicles-detail" disabled={busy}>
      <header><div><span className="chronicles-eyebrow">EDITION {position + 1} OF {all.length}</span><h3>{current.year}<span>{current.id == null ? 'New edition' : edits[current.key] ? 'Draft changes' : 'Saved edition'}</span></h3></div><div className="chronicles-order" role="group" aria-label="Milestone order"><button type="button" aria-label="Move milestone earlier" title="Move earlier" disabled={position === 0} onClick={() => move(-1)}><ArrowLeftIcon /></button><button type="button" aria-label="Move milestone later" title="Move later" disabled={position === all.length - 1} onClick={() => move(1)}><ArrowRightIcon /></button></div></header>
      <StudioGroup title="The story" description="Keep the highlights short. These appear on the public timeline card.">
        <StudioField label="Milestone year" type="number" min={1900} max={3000} required value={current.year} onChange={year => edit({ year: Number(year) })} />
        {invalidYear && <p className="chronicles-error" role="alert">Use a unique year between 1900 and 3000.</p>}
        <StudioField label="Milestone title" value={current.title} onChange={title => edit({ title })} hint="A short headline for this edition." />
        <StudioField label="Milestone points" multiline value={current.points.join('\n')} onChange={text => edit({ points: text.split('\n') })} hint="One highlight per line: artists, events or memorable moments." />
      </StudioGroup>
      <RoadmapPhotoEditor key={current.key} images={current.images} year={current.year} onChange={images => edit({ images })} onProcessingChange={processing} />
      <StudioGroup title="On the timeline">
        <StudioToggle label="Show this milestone" description="Hidden editions stay saved for later." checked={current.enabled} onChange={enabled => edit({ enabled })} />
        <div className="studio-field"><label htmlFor="roadmap-side">Card side</label><select id="roadmap-side" value={current.side} onChange={event => edit({ side: event.target.value as RoadmapItemDraft['side'] })}><option value="auto">Automatic · alternate sides</option><option value="left">Left</option><option value="right">Right</option></select></div>
      </StudioGroup>
      {current.id == null && <button type="button" className="studio-text-button chronicles-remove" onClick={() => { setEdits(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => key !== current.key))); setSelected(''); }}>Remove new milestone from draft</button>}
    </fieldset>}
  </div>;
}
