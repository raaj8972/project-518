import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, Eye, FileText, Calendar, MapPin, Users, Star, EyeOff, UserPlus, UserMinus, Plus } from 'lucide-react';
import { useApprovals, PendingApproval } from '../../hooks/useApprovals';
import { formatDistanceToNow } from 'date-fns';
import { useData } from '../../context/DataContext';
import { ComingSoon } from '../../pages/ComingSoon';
import { ImageUpload } from '../ImageUpload';

// ---- Rules (structured) helpers (v2) ----
type RuleBlock = { kind: 'points'; style?: 'bullet' | 'number'; title?: string; items: string[] };
type RuleSection = { heading?: string; blocks?: RuleBlock[] };
type RuleSectionV1 = { heading?: string; subheading?: string; points?: string[] };
const STRUCTURED_MARK = '__SR__';
const isStructuredRules = (rules: string[] | null | undefined): boolean => Array.isArray(rules) && rules.length === 1 && typeof rules[0] === 'string' && rules[0].startsWith(STRUCTURED_MARK);
const normalizeV1toV2 = (list: RuleSectionV1[]): RuleSection[] => {
  return (list || []).map((s) => ({
    heading: s.heading,
    blocks: [
      ...(s.points && s.points.length ? [{ kind: 'points', style: 'number', title: s.subheading, items: s.points }] as RuleBlock[] : [])
    ]
  }));
};
const unpackStructured = (rules: string[] | null | undefined): RuleSection[] => {
  try {
    if (!isStructuredRules(rules)) return [];
    const s = (rules as string[])[0].slice(STRUCTURED_MARK.length);
    const parsed = JSON.parse(s);
    if (parsed?.v === 2 && Array.isArray(parsed.sections)) return parsed.sections as RuleSection[];
    if (Array.isArray(parsed?.sections)) return normalizeV1toV2(parsed.sections as RuleSectionV1[]);
    return [];
  } catch { return []; }
};
const packStructured = (sections: RuleSection[]): string[] => [STRUCTURED_MARK + JSON.stringify({ v: 2, sections })];


const RulesFieldEditor: React.FC<{ value: string[]; onChange: (val: string[]) => void }> = ({ value, onChange }) => {
  const [isStructured, setIsStructured] = useState<boolean>(isStructuredRules(value));
  const [sections, setSections] = useState<RuleSection[]>(isStructuredRules(value) ? unpackStructured(value) : []);

  // Sync internal state if external value changes significantly (e.g. reset)
  React.useEffect(() => {
    const structured = isStructuredRules(value);
    setIsStructured(structured);
    if (structured) {
      setSections(unpackStructured(value));
    }
  }, [value]);

  const updateSections = (newSections: RuleSection[]) => {
    setSections(newSections);
    onChange(packStructured(newSections));
  };

  const toggleMode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    if (enabled) {
      setIsStructured(true);
      if (sections.length === 0) {
        const initial = value && value.length && !isStructuredRules(value) ? [...value] : [''];
        const newSecs = [{ heading: '', blocks: [{ kind: 'points', style: 'number', title: '', items: initial }] }] as RuleSection[];
        updateSections(newSecs);
      } else {
        // Just re-pack existing sections
        onChange(packStructured(sections));
      }
    } else {
      // Flatten
      const flat = sections.flatMap(s => (s.blocks || []).flatMap(b => (b.items || [])).filter(p=>p && p.trim()));
      setIsStructured(false);
      onChange(flat.length ? flat : []);
    }
  };

  // Simple list helpers
  const updateSimpleRule = (index: number, val: string) => {
    const newRules = [...value];
    newRules[index] = val;
    onChange(newRules);
  };
  const removeSimpleRule = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };
  const addSimpleRule = () => {
    onChange([...value, '']);
  };

  // Structured helpers
  const addSection = () => updateSections([...sections, { heading: '', blocks: [{ kind: 'points', style: 'number', title: '', items: [''] }] }]);
  const removeSection = (idx: number) => updateSections(sections.filter((_, i) => i !== idx));
  const updateSectionField = (idx: number, field: 'heading', val: string) => updateSections(sections.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  
  const addBlock = (idx: number) => updateSections(sections.map((s, i) => i === idx ? { ...s, blocks: [...(s.blocks || []), { kind: 'points', style: 'number', title: '', items: [''] }] } : s));
  const removeBlock = (idx: number, bIdx: number) => updateSections(sections.map((s, i) => i === idx ? { ...s, blocks: (s.blocks || []).filter((_, j) => j !== bIdx) } : s));
  const updateBlockField = (idx: number, bIdx: number, patch: Partial<RuleBlock>) => updateSections(sections.map((s, i) => i === idx ? { ...s, blocks: (s.blocks || []).map((b, j) => j === bIdx ? { ...b, ...patch } : b) } : s));
  
  const addItem = (idx: number, bIdx: number) => updateSections(sections.map((s, i) => i === idx ? { ...s, blocks: (s.blocks || []).map((b, j) => j === bIdx ? { ...b, items: [...(b.items || []), ''] } : b) } : s));
  const removeItem = (idx: number, bIdx: number, pIdx: number) => updateSections(sections.map((s, i) => i === idx ? { ...s, blocks: (s.blocks || []).map((b, j) => j === bIdx ? { ...b, items: (b.items || []).filter((_, k) => k !== pIdx) } : b) } : s));
  const updateItem = (idx: number, bIdx: number, pIdx: number, val: string) => updateSections(sections.map((s, i) => i === idx ? { ...s, blocks: (s.blocks || []).map((b, j) => j === bIdx ? { ...b, items: (b.items || []).map((p, k) => k === pIdx ? val : p) } : b) } : s));

  return (
    <div className="border border-gray-300 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
        <label className="text-sm font-medium text-gray-700">Rules Editor</label>
        <label className="text-xs text-gray-700 flex items-center select-none cursor-pointer">
          <input type="checkbox" className="mr-2 rounded text-yellow-600 focus:ring-yellow-500" checked={isStructured} onChange={toggleMode} />
          Structured Mode
        </label>
      </div>

      {!isStructured ? (
        <div className="space-y-2">
          {value.map((rule, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={rule}
                onChange={(e) => updateSimpleRule(index, e.target.value)}
                placeholder="Rule point"
                className="flex-1 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
              />
              <button type="button" onClick={() => removeSimpleRule(index)} className="text-red-600 hover:text-red-800 p-1"><XCircle size={16} /></button>
            </div>
          ))}
          <button type="button" onClick={addSimpleRule} className="text-blue-600 hover:text-blue-700 text-sm flex items-center"><Plus size={16} className="mr-1" />Add Rule</button>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((sec, idx) => (
            <div key={idx} className="border border-gray-200 rounded p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-gray-700">Section {idx+1}</div>
                <button type="button" onClick={()=>removeSection(idx)} className="text-red-600 text-xs hover:text-red-800">Remove section</button>
              </div>
              <input className="w-full p-2 text-sm border border-gray-300 rounded mb-2 text-gray-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none" placeholder="Heading (optional)" value={sec.heading || ''} onChange={(e)=>updateSectionField(idx,'heading',e.target.value)} />
              <div className="space-y-3">
                {(sec.blocks || []).map((b, bIdx) => (
                  <div key={bIdx} className="border border-dashed border-gray-300 rounded p-2 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-gray-700">Points block {bIdx+1}</div>
                      <div className="flex items-center gap-2">
                        <select className="text-xs border border-gray-300 rounded p-1 bg-white text-gray-900 focus:ring-1 focus:ring-yellow-400 focus:outline-none" value={b.style || 'number'} onChange={(e)=>updateBlockField(idx,bIdx,{ style: (e.target.value as 'bullet'|'number') })}>
                          <option value="number">Numbered</option>
                          <option value="bullet">Bullets</option>
                        </select>
                        <button type="button" onClick={()=>removeBlock(idx,bIdx)} className="text-red-600 text-[11px] hover:text-red-800">Remove</button>
                      </div>
                    </div>
                    <input className="w-full p-1.5 text-xs border border-gray-300 rounded mb-2 text-gray-900 bg-white focus:ring-1 focus:ring-yellow-400 focus:outline-none" placeholder="Block title (optional)" value={b.title || ''} onChange={(e)=>updateBlockField(idx,bIdx,{ title: e.target.value })} />
                    <div className="space-y-1">
                      {(b.items || []).map((p, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-2">
                          <input className="flex-1 p-1.5 text-xs border border-gray-300 rounded text-gray-900 bg-white focus:ring-1 focus:ring-yellow-400 focus:outline-none" placeholder={`Point ${pIdx+1}`} value={p} onChange={(e)=>updateItem(idx,bIdx,pIdx,e.target.value)} />
                          <button type="button" onClick={()=>removeItem(idx,bIdx,pIdx)} className="text-red-600 hover:text-red-800"><XCircle size={14} /></button>
                        </div>
                      ))}
                      <button type="button" onClick={()=>addItem(idx,bIdx)} className="text-blue-600 hover:text-blue-700 text-[11px] flex items-center"><Plus size={12} className="mr-1" />Add point</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={()=>addBlock(idx)} className="text-purple-700 hover:text-purple-800 text-xs flex items-center"><Plus size={14} className="mr-1" />Add Points Block</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addSection} className="text-purple-700 hover:text-purple-800 text-sm flex items-center"><Plus size={16} className="mr-1" />Add Section</button>
        </div>
      )}
    </div>
  );
};

export const OwnerApprovalCenter: React.FC = () => {
  const { pendingApprovals, loading, approveChange, rejectChange } = useApprovals();
  const { events, siteSettings } = useData();
  const [selectedTab, setSelectedTab] = useState<'pending' | 'all'>('pending');
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editedChanges, setEditedChanges] = useState<any>(null);

  // Initialize editedChanges when expanding an item
  const handleExpand = (id: number, changes: any) => {
    if (expandedId === id) {
      setExpandedId(null);
      setEditedChanges(null);
    } else {
      setExpandedId(id);
      setEditedChanges(changes);
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'event': return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'sponsor': return <FileText className="w-5 h-5 text-green-500" />;
      case 'gallery_image': return <Eye className="w-5 h-5 text-purple-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEntityName = (entityType: string) => {
    return entityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleApprove = async (id: number) => {
    if (confirm('Are you sure you want to approve this change? It will immediately be visible on the public site.')) {
      // If we have edited changes for this item, use them
      const changesToApprove = (expandedId === id && editedChanges) ? editedChanges : undefined;
      
      const result = await approveChange(id, changesToApprove);
      if (result.success) {
        alert('Change approved successfully!');
      } else {
        alert(`Failed to approve: ${result.error}`);
      }
    }
  };

  const handleReject = async (id: number) => {
    const result = await rejectChange(id, rejectionReason);
    if (result.success) {
      alert('Change rejected successfully!');
      setRejectingId(null);
      setRejectionReason('');
    } else {
      alert(`Failed to reject: ${result.error}`);
    }
  };

  const formatKey = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };



  const renderEventPreview = (approval: PendingApproval, currentChanges: any) => {
    // Construct the preview object
    let previewEvent: any = {};

    if (approval.action_type === 'update' && approval.entity_id) {
      const originalEvent = events.find((e: any) => e.id === approval.entity_id);
      if (originalEvent) {
        previewEvent = { ...originalEvent, ...currentChanges };
      } else {
        previewEvent = { ...currentChanges };
      }
    } else {
      previewEvent = { ...currentChanges };
    }

    // Ensure some defaults for preview if missing
    if (!previewEvent.title) previewEvent.title = '[Event Title]';
    if (!previewEvent.category) previewEvent.category = 'Category';

    return (
      <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm max-w-md mx-auto sm:mx-0">
        <div className="px-4 py-2 bg-gray-100 border-b text-sm text-gray-700 font-medium flex justify-between items-center">
          <span>Event Card Preview</span>
          <span className="text-xs text-gray-500">Live preview</span>
        </div>
        <div className="bg-white rounded-b-lg overflow-hidden">
          <div className="relative h-48">
            {previewEvent.image ? (
              <img
                src={previewEvent.image}
                alt={previewEvent.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                <FileText size={48} />
              </div>
            )}
            <div className="absolute top-2 right-2 flex space-x-1">
              {/* Registration mode badge */}
              <div className="bg-gray-900/70 text-xs text-white px-2 py-1 rounded mr-1 flex items-center">
                {previewEvent.registration_default_mode === 'team' ? 'Mode: Team' : 'Mode: Individual'}
              </div>
              {previewEvent.featured && (
                <span className="bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-medium">
                  <Star size={12} className="inline mr-1" />
                  Featured
                </span>
              )}
              {previewEvent.visible === false && (
                <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  Hidden
                </span>
              )}
            </div>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg text-gray-900">{previewEvent.title}</h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {previewEvent.category}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{previewEvent.description}</p>
            <div className="space-y-1 text-xs text-gray-500 mb-3">
              {previewEvent.date && (
                <div className="flex items-center">
                  <Calendar size={12} className="mr-1" />
                  {previewEvent.date}
                </div>
              )}
              {previewEvent.time && (
                <div className="flex items-center">
                  <Clock size={12} className="mr-1" />
                  {previewEvent.time}
                </div>
              )}
              {previewEvent.venue && (
                <div className="flex items-center">
                  <MapPin size={12} className="mr-1" />
                  {previewEvent.venue}
                </div>
              )}
              {(previewEvent.max_participants || previewEvent.participants) && (
                <div className="flex items-center">
                  <Users size={12} className="mr-1" />
                  {previewEvent.max_participants
                    ? `${previewEvent.current_registrations || 0} / ${previewEvent.max_participants} participants`
                    : `${String(previewEvent.participants || '').trim()} participants`}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
               <div className="flex space-x-1">
                  <div className={`p-1 rounded ${previewEvent.featured ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Star size={14} className={previewEvent.featured ? 'fill-current' : ''} />
                  </div>
                  <div className={`p-1 rounded ${previewEvent.visible !== false ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {previewEvent.visible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                  </div>
                  <div className={`p-1 rounded ${previewEvent.registration_open ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    {previewEvent.registration_open ? <UserPlus size={14} /> : <UserMinus size={14} />}
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  {previewEvent.registration_open ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">Live Now</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">Closed</span>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderChangeDetails = (approval: PendingApproval) => {
    const changes = approval.changes;
    
    // Filter out internal fields if any
    const displayChanges = Object.entries(changes).filter(([key, value]) => {
      if (['updated_at', 'created_at'].includes(key)) return false;
      // Hide legacy fields if empty (they are replaced by 'coordinators' array)
      if (['coordinator_name', 'coordinator_phone'].includes(key) && !value) return false;
      return true;
    });
    
    const renderEditableField = (key: string, value: any) => {
      // Media fields (Image/Video) - Hide raw URL, show preview & upload
      // Exclude watch_live_url as it is a text link, not a file upload
      if ((key.includes('image') || key.includes('url') || key.includes('photo') || key.includes('poster') || key.includes('logo')) && key !== 'watch_live_url') {
        // Exception: registration_photo_required is a boolean, not a media upload
        if (key === 'registration_photo_required') {
           return (
            <div className="flex items-center mt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!editedChanges?.[key]}
                  onChange={(e) => setEditedChanges({ ...editedChanges, [key]: e.target.checked })}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="text-sm text-gray-700">Require Photo (Toggle to change)</span>
              </label>
            </div>
          );
        }
        // Exception: registration_photo_label is a text label
        if (key === 'registration_photo_label') {
          return (
             <div className="space-y-2">
              <input
                type="text"
                value={editedChanges?.[key] || ''}
                onChange={(e) => setEditedChanges({ ...editedChanges, [key]: e.target.value })}
                placeholder="e.g., Participant Photo"
                className="w-full mt-1 text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              />
              <p className="text-xs text-gray-500">Label shown to users on registration form.</p>
            </div>
          );
        }

        return (
          <div className="mt-1">
            {editedChanges?.[key] && (
              <div className="mb-2">
                <span className="text-xs text-gray-500 block mb-1">Preview:</span>
                {/* Show video preview if it looks like a video URL or field name */}
                {(key.includes('motion_poster') || key.includes('video') || (typeof editedChanges[key] === 'string' && editedChanges[key].match(/\.(mp4|mov|webm)$/i))) ? (
                  <video src={editedChanges[key]} className="h-24 w-auto object-cover rounded border border-gray-200" controls />
                ) : (
                  <img src={editedChanges[key]} alt="Preview" className="h-20 w-auto object-cover rounded border border-gray-200" />
                )}
              </div>
            )}
            <div className="mt-2">
              <span className="text-xs text-gray-500 block mb-1">Upload New File:</span>
              {(() => {
                // Determine upload config based on field key and entity
                const isVideo = key.includes('motion_poster') || key.includes('video');
                const isEventImage = approval.entity_type === 'event' && key === 'image';
                
                let bucket = 'event-images'; // default
                if (approval.entity_type === 'sponsor') bucket = 'sponsor-logos';
                else if (approval.entity_type === 'gallery_image') bucket = 'gallery-images';
                else if (approval.entity_type === 'guest_artist') bucket = 'guest-artist-images';
                else if (approval.entity_type === 'team_member') bucket = 'team-images';
                else if (approval.entity_type === 'faculty_head') bucket = 'faculty-images';
                else if (approval.entity_type === 'sport') bucket = 'sports-images';

                let folder = approval.entity_type;
                if (isVideo) folder += '/motion-posters';

                return (
                  <ImageUpload
                    onImageSelect={(url) => setEditedChanges({ ...editedChanges, [key]: url })}
                    bucket={bucket as any}
                    folder={folder}
                    currentImage={editedChanges?.[key]}
                    autoSave={true}
                    hideControls={true}
                    className="w-full"
                    // Video specific props
                    acceptedTypes={isVideo ? "video/*" : "image/*"}
                    fileTypeLabel={isVideo ? "MP4, MOV, WEBM up to 50MB" : (isEventImage ? "PNG or JPG up to 20MB. 16:9 ratio recommended." : "PNG or JPG up to 5MB")}
                    enableCropper={!isVideo}
                    cropAspect={isEventImage ? 16/9 : undefined}
                  />
                );
              })()}
            </div>
          </div>
        );
      }

      // Specific Event Fields
      if (key === 'watch_live_url') {
        return (
          <input
            type="url"
            value={editedChanges?.[key] || ''}
            onChange={(e) => setEditedChanges({ ...editedChanges, [key]: e.target.value })}
            placeholder="https://..."
            className="w-full mt-1 text-sm text-gray-900 bg-white border-gray-300 rounded-md shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          />
        );
      }

      if (key === 'coordinators') {
        const coords = (editedChanges?.[key] || []) as any[];
        return (
          <div className="mt-2 space-y-2 border border-gray-200 rounded p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Coordinators List</span>
              <button
                type="button"
                onClick={() => setEditedChanges({ ...editedChanges, [key]: [...coords, { name: '', phone: '', order_position: coords.length + 1 }] })}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                + Add
              </button>
            </div>
            {coords.map((c, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => {
                    const newCoords = [...coords];
                    newCoords[idx] = { ...c, name: e.target.value };
                    setEditedChanges({ ...editedChanges, [key]: newCoords });
                  }}
                  placeholder="Name"
                  className="flex-1 p-1 text-sm border rounded bg-white"
                />
                <input
                  type="text"
                  value={c.phone || ''}
                  onChange={(e) => {
                    const newCoords = [...coords];
                    newCoords[idx] = { ...c, phone: e.target.value };
                    setEditedChanges({ ...editedChanges, [key]: newCoords });
                  }}
                  placeholder="Phone"
                  className="flex-1 p-1 text-sm border rounded bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newCoords = coords.filter((_, i) => i !== idx);
                    setEditedChanges({ ...editedChanges, [key]: newCoords });
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  <XCircle size={14} />
                </button>
              </div>
            ))}
            {coords.length === 0 && <div className="text-xs text-gray-500 italic">No coordinators added.</div>}
          </div>
        );
      }

      // Legacy fields are filtered out if empty, but if present (non-empty), render as text
      if (key === 'coordinator_name' || key === 'coordinator_phone') {
        return (
          <input
            type="text"
            value={editedChanges?.[key] || ''}
            onChange={(e) => setEditedChanges({ ...editedChanges, [key]: e.target.value })}
            placeholder={key.replace('_', ' ')}
            className="w-full mt-1 text-sm text-gray-900 bg-white border-gray-300 rounded-md shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          />
        );
      }

      if (key === 'team_max_members') {
        return (
          <div className="flex items-center gap-2">
             <input
              type="number"
              min={2}
              max={50}
              value={editedChanges?.[key] ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                const n = v === '' ? null : Math.max(2, Math.min(50, Number(v)));
                setEditedChanges({ ...editedChanges, [key]: Number.isNaN(Number(v)) ? null : n });
              }}
              placeholder="Default 50"
              className="w-32 mt-1 text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            />
            <span className="text-xs text-gray-500 mt-1">Min 2, Max 50</span>
          </div>
        );
      }

      if (key === 'registration_default_mode') {
        return (
          <div className="flex items-center gap-4 mt-1">
             <label className="flex items-center text-sm text-gray-900">
                <input 
                  type="radio" 
                  name={`reg_mode_${approval.id}`} 
                  className="mr-2 text-yellow-600 focus:ring-yellow-500" 
                  value="individual" 
                  checked={editedChanges?.[key] === 'individual'} 
                  onChange={() => setEditedChanges({ ...editedChanges, [key]: 'individual' })} 
                /> 
                Individual
              </label>
              <label className="flex items-center text-sm text-gray-900">
                <input 
                  type="radio" 
                  name={`reg_mode_${approval.id}`} 
                  className="mr-2 text-yellow-600 focus:ring-yellow-500" 
                  value="team" 
                  checked={editedChanges?.[key] === 'team'} 
                  onChange={() => setEditedChanges({ ...editedChanges, [key]: 'team' })} 
                /> 
                Team
              </label>
          </div>
        );
      }

      if (key === 'registration_participant_types') {
        const siteList = (siteSettings as any)?.registration_participant_types as string[] || [];
        const currentTypes = (editedChanges?.[key] || []) as string[];
        const currentQuotas = (editedChanges?.['registration_participant_quotas'] || {}) as Record<string, number>;

        if (!siteList.length) return <div className="text-sm text-gray-500 italic">No batches defined in Site Settings.</div>;

        return (
          <div className="mt-2 space-y-2 border border-gray-200 rounded p-3 bg-gray-50">
             <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  className="text-xs px-2 py-1 border rounded bg-white text-gray-700 hover:bg-gray-100"
                  onClick={() => setEditedChanges({ ...editedChanges, [key]: [...siteList] })}
                >Select all</button>
                <button
                  type="button"
                  className="text-xs px-2 py-1 border rounded bg-white text-gray-700 hover:bg-gray-100"
                  onClick={() => setEditedChanges({ ...editedChanges, [key]: [], registration_participant_quotas: {} })}
                >Clear all</button>
              </div>
              {siteList.map((t) => {
                const selected = currentTypes.includes(t);
                const limitVal = currentQuotas[t] ?? '';
                return (
                  <div key={t} className="flex items-center justify-between p-2 border rounded bg-white">
                    <div className="flex items-center gap-3 w-full">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const newTypes = new Set(currentTypes);
                            const newQuotas = { ...currentQuotas };
                            if (checked) newTypes.add(t);
                            else { 
                              newTypes.delete(t); 
                              delete newQuotas[t]; 
                            }
                            setEditedChanges({ ...editedChanges, [key]: Array.from(newTypes), registration_participant_quotas: newQuotas });
                          }}
                          className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                        />
                        <span className="text-sm min-w-[100px] text-gray-900">{t}</span>
                      </label>
                      <div className="flex items-center gap-2 ml-auto">
                        <label className="text-xs text-gray-500">Limit:</label>
                        <input
                          type="number"
                          min={0}
                          className={`w-20 border rounded px-2 py-1 text-xs ${!selected ? 'bg-gray-100 text-gray-400' : 'text-gray-900'}`}
                          placeholder={selected ? 'Unlimited' : 'N/A'}
                          value={limitVal}
                          disabled={!selected}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const newQuotas = { ...currentQuotas };
                            if (raw === '') delete newQuotas[t];
                            else newQuotas[t] = Math.max(0, parseInt(raw || '0')) || 0;
                            setEditedChanges({ ...editedChanges, registration_participant_quotas: newQuotas });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        );
      }
      
      // Skip rendering quotas directly as they are handled within batches
      if (key === 'registration_participant_quotas') return null;

      // Handle different types of values
      if (typeof value === 'boolean') {
        return (
          <div className="flex items-center mt-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!editedChanges?.[key]}
                onChange={(e) => setEditedChanges({ ...editedChanges, [key]: e.target.checked })}
                className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
              <span className="text-sm text-gray-700">{value ? 'True' : 'False'} (Toggle to change)</span>
            </label>
          </div>
        );
      }

      if (key.includes('date') || key.includes('until') || key.includes('at')) {
        const safeDateValue = (val: any) => {
          if (!val) return '';
          const d = new Date(val);
          return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
        };

        return (
          <input
            type="datetime-local"
            value={safeDateValue(editedChanges?.[key])}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                setEditedChanges({ ...editedChanges, [key]: null });
              } else {
                const d = new Date(val);
                if (!isNaN(d.getTime())) {
                  setEditedChanges({ ...editedChanges, [key]: d.toISOString() });
                }
              }
            }}
            className="w-full mt-1 text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          />
        );
      }

      if (typeof value === 'string' && value.length > 100) {
        return (
          <textarea
            value={editedChanges?.[key] || ''}
            onChange={(e) => setEditedChanges({ ...editedChanges, [key]: e.target.value })}
            rows={4}
            className="w-full mt-1 text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          />
        );
      }

      // Rules Editor
      if (key === 'rules') {
        const rulesValue = Array.isArray(value) ? value : [];
        return (
          <div className="mt-1">
            <RulesFieldEditor
              value={editedChanges?.[key] || rulesValue}
              onChange={(newRules) => setEditedChanges({ ...editedChanges, [key]: newRules })}
            />
          </div>
        );
      }

      // Social Links Editor
      if (key === 'social_links') {
        const links = (editedChanges?.[key] || {}) as Record<string, string>;
        // Default set of keys to show if empty, or just show existing keys + common ones
        const commonKeys = ['instagram', 'youtube', 'spotify', 'facebook', 'twitter', 'linkedin'];
        const allKeys = Array.from(new Set([...Object.keys(links), ...commonKeys]));

        return (
          <div className="mt-2 space-y-2 border border-gray-200 rounded p-3 bg-gray-50">
            <div className="text-xs font-semibold text-gray-700 mb-2">Social Media Links</div>
            {allKeys.map((platform) => (
              <div key={platform} className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500 w-20 capitalize">{platform}</span>
                <input
                  type="url"
                  value={links[platform] || ''}
                  onChange={(e) => {
                    const newLinks = { ...links, [platform]: e.target.value };
                    // Remove empty keys to keep it clean? Or keep them?
                    // Let's keep them as empty strings if user clears them, 
                    // or maybe filter out empty ones on save. 
                    // For editing, it's better to keep them.
                    setEditedChanges({ ...editedChanges, [key]: newLinks });
                  }}
                  placeholder={`https://${platform}.com/...`}
                  className="flex-1 p-1.5 text-sm border rounded bg-white text-gray-900 focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                />
              </div>
            ))}
          </div>
        );
      }

      // Default text input
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={editedChanges?.[key] || ''}
            onChange={(e) => setEditedChanges({ ...editedChanges, [key]: e.target.value })}
            className="w-full mt-1 text-sm text-gray-900 border-gray-300 rounded-md shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          />
        </div>
      );
    };

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h5 className="font-semibold text-sm text-gray-700 mb-3 flex items-center justify-between">
          <div className="flex items-center">
            <FileText size={16} className="mr-2" />
            Change Preview & Edit
          </div>
          <span className="text-xs font-normal text-gray-500 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
            Editable Mode
          </span>
        </h5>

        {/* Live Preview for Events */}
        {approval.entity_type === 'event' && renderEventPreview(approval, editedChanges || changes)}

        {/* Live Preview for Site Settings */}
        {approval.entity_type === 'site_settings' && (
          <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 border-b text-sm text-gray-700 font-medium flex justify-between items-center">
              <span>Live Preview (Coming Soon Page)</span>
              <span className="text-xs text-gray-500">Updates as you edit below</span>
            </div>
            <div className="aspect-video bg-black relative">
              <div className="absolute inset-0 transform scale-[0.4] origin-top-left w-[250%] h-[250%]">
                <ComingSoon previewSettings={editedChanges || changes} />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {displayChanges.map(([key, value]) => (
            <div key={key} className="flex flex-col sm:flex-row sm:items-start border-b border-gray-100 last:border-0 pb-4 last:pb-0">
              <div className="w-full sm:w-1/3 pt-2">
                <span className="font-medium text-gray-700 text-sm">{formatKey(key)}</span>
                <div className="text-xs text-gray-400 mt-0.5 font-mono">{key}</div>
              </div>
              <div className="w-full sm:w-2/3 mt-1 sm:mt-0">
                {renderEditableField(key, value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Owner Approval Center</h2>
        <p className="text-gray-600">Review and approve changes submitted by admins</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setSelectedTab('pending')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              selectedTab === 'pending'
                ? 'border-yellow-400 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Pending ({pendingApprovals.length})</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Pending Approvals List */}
      {pendingApprovals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-400" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">All Caught Up!</h3>
          <p className="text-gray-500">No pending approvals at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingApprovals.map((approval) => (
            <div key={approval.id} className="bg-white rounded-lg shadow-md border-l-4 border-yellow-400">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    {getEntityIcon(approval.entity_type)}
                    <div>
                      <h4 className="font-semibold text-lg text-gray-900">
                        {formatEntityName(approval.entity_type)}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(approval.action_type)}`}>
                          {approval.action_type.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          by {approval.admin_email}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Quick Summary */}
                <div className="mb-4">
                  {approval.action_type === 'create' && approval.changes.title && (
                    <p className="text-gray-700">
                      <span className="font-medium">Title:</span> {approval.changes.title}
                    </p>
                  )}
                  {approval.action_type === 'create' && approval.changes.name && (
                    <p className="text-gray-700">
                      <span className="font-medium">Name:</span> {approval.changes.name}
                    </p>
                  )}
                </div>

                {/* Expand/Collapse Details */}
                <button
                  onClick={() => handleExpand(approval.id, approval.changes)}
                  className="text-yellow-600 hover:text-yellow-700 text-sm font-medium mb-3"
                >
                  {expandedId === approval.id ? '▼ Hide Details' : '▶ View Details'}
                </button>

                {/* Expanded Details */}
                {expandedId === approval.id && renderChangeDetails(approval)}

                {/* Actions */}
                {rejectingId === approval.id ? (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason (optional):
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this change is being rejected..."
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-gray-900"
                    />
                    <div className="flex justify-end space-x-2 mt-3">
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setRejectionReason('');
                        }}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReject(approval.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setRejectingId(approval.id)}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                    >
                      <XCircle size={16} className="mr-2" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(approval.id)}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Approve & Publish
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
