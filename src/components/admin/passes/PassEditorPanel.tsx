import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Calendar,
  Clock,
  Copy,
  ImagePlus,
  Loader2,
  QrCode,
  Save,
  Trash2,
  Type,
  Users,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../../lib/supabase';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../ToastProvider';
import type { TemplateConfig, TextLayerConfig } from '../../../utils/passRenderer';

type ActiveLayer = 'qr' | 'name' | 'gateTime' | 'allowedLimit' | 'dateLabel';

const DEFAULT_DAY_CONFIG: TemplateConfig = {
  bgUrl: '',
  aspectRatio: 3,
  qr: { x: 85, y: 50, size: 16 },
  name: {
    enabled: true,
    x: 24,
    y: 42,
    fontSize: 3.4,
    color: '#111827',
    align: 'left',
    fontFamily: 'Anton',
    bold: true,
  },
  gateTime: {
    enabled: true,
    text: 'Gates Open: 5:00 PM',
    x: 24,
    y: 58,
    fontSize: 2.1,
    color: '#374151',
    align: 'left',
    bold: true,
  },
  allowedLimit: {
    enabled: true,
    text: 'Admits 1 Person',
    x: 24,
    y: 70,
    fontSize: 1.9,
    color: '#426b52',
    align: 'left',
    bold: true,
  },
  dateLabel: {
    enabled: false,
    x: 24,
    y: 82,
    fontSize: 1.9,
    color: '#4b5563',
    align: 'left',
    bold: false,
  },
};

export const PassEditorPanel: React.FC = () => {
  const { securitySettings, updateSecuritySettings } = useData();
  const { push: toast } = useToast();

  const [activeDay, setActiveDay] = useState<number>(0);
  const [configs, setConfigs] = useState<Record<string, TemplateConfig>>({});
  const [selectedLayer, setSelectedLayer] = useState<ActiveLayer>('qr');
  const [sampleName, setSampleName] = useState('Aarav Sharma');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(720);
  const draggingLayer = useRef<ActiveLayer | null>(null);

  useEffect(() => {
    if (securitySettings?.pass_template_config) {
      setConfigs(securitySettings.pass_template_config as Record<string, TemplateConfig>);
    }
  }, [securitySettings]);

  useEffect(() => {
    const id = 'ep-editor-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.href =
        'https://fonts.googleapis.com/css2?family=Anton&family=Orbitron:wght@600;700&family=Rajdhani:wght@600;700&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) setStageWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeDay, configs]);

  const eventDates: string[] = securitySettings?.event_dates || [];
  const dayKeys = [0, 1, 2];
  const currentKey = `day_${activeDay}`;

  const current: TemplateConfig = {
    ...DEFAULT_DAY_CONFIG,
    ...(configs[currentKey] || {}),
    qr: { ...DEFAULT_DAY_CONFIG.qr, ...(configs[currentKey]?.qr || {}) },
    name: { ...DEFAULT_DAY_CONFIG.name!, ...(configs[currentKey]?.name || {}) },
    gateTime: { ...DEFAULT_DAY_CONFIG.gateTime!, ...(configs[currentKey]?.gateTime || {}) },
    allowedLimit: { ...DEFAULT_DAY_CONFIG.allowedLimit!, ...(configs[currentKey]?.allowedLimit || {}) },
    dateLabel: { ...DEFAULT_DAY_CONFIG.dateLabel!, ...(configs[currentKey]?.dateLabel || {}) },
  };

  const updateDay = (updates: Partial<TemplateConfig>) => {
    setConfigs((prev) => ({
      ...prev,
      [currentKey]: {
        ...current,
        ...updates,
      },
    }));
  };

  const updateTextLayer = (
    layerKey: 'name' | 'gateTime' | 'allowedLimit' | 'dateLabel',
    updates: Partial<TextLayerConfig>
  ) => {
    updateDay({
      [layerKey]: {
        ...(current[layerKey] as TextLayerConfig),
        ...updates,
      },
    });
  };

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Detect natural aspect ratio first
      const objUrl = URL.createObjectURL(file);
      const ratio = await new Promise<number>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const r = img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 3;
          URL.revokeObjectURL(objUrl);
          resolve(Number(r.toFixed(3)));
        };
        img.onerror = () => {
          URL.revokeObjectURL(objUrl);
          resolve(3);
        };
        img.src = objUrl;
      });

      const ext = file.name.split('.').pop() || 'png';
      const filePath = `templates/pass-template-${currentKey}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('public-content')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('public-content').getPublicUrl(filePath);

      updateDay({ bgUrl: publicUrl, aspectRatio: ratio });
      toast({ message: `Day ${activeDay + 1} design uploaded!`, type: 'success' });
    } catch (err: any) {
      toast({ message: 'Could not upload design: ' + (err.message || 'Unknown error'), type: 'error' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleCopyLayoutToOtherDays = () => {
    setConfigs((prev) => {
      const next = { ...prev };
      for (const idx of [0, 1, 2]) {
        if (idx === activeDay) continue;
        const k = `day_${idx}`;
        const existing = prev[k] || DEFAULT_DAY_CONFIG;
        next[k] = {
          ...current,
          bgUrl: existing.bgUrl || '',
          aspectRatio: existing.aspectRatio || current.aspectRatio,
        };
      }
      return next;
    });
    toast({ message: 'Positions and font styles copied to Day 1, Day 2, and Day 3.', type: 'success' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSecuritySettings({ pass_template_config: configs });
      toast({ message: 'Pass designs saved! Both Student and VIP passes will use this design.', type: 'success' });
    } catch (err: any) {
      toast({ message: 'Could not save design: ' + (err.message || 'Unknown error'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const moveLayerFromPointer = (clientX: number, clientY: number) => {
    const layer = draggingLayer.current;
    const stage = stageRef.current;
    if (!layer || !stage) return;
    const rect = stage.getBoundingClientRect();
    const xPct = Number(Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100)).toFixed(1));
    const yPct = Number(Math.max(4, Math.min(96, ((clientY - rect.top) / rect.height) * 100)).toFixed(1));

    if (layer === 'qr') {
      updateDay({ qr: { ...current.qr, x: xPct, y: yPct } });
    } else {
      updateTextLayer(layer, { x: xPct, y: yPct });
    }
  };

  const activeTextLayer =
    selectedLayer === 'qr' ? null : (current[selectedLayer] as TextLayerConfig);

  const layerLabels: Record<ActiveLayer, string> = {
    qr: 'QR Code',
    name: 'Guest / Student Name',
    gateTime: 'Gate Time',
    allowedLimit: 'Allowed Entries',
    dateLabel: 'Event Date',
  };

  const aspect = current.aspectRatio && current.aspectRatio > 0 ? current.aspectRatio : 3;

  return (
    <div className="space-y-5">
      {/* Top action bar */}
      <div className="bg-white border border-[#e2e8df] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#26352e]">Pass Design Editor</h2>
          <p className="text-xs text-[#65726a] mt-0.5">
            Upload your pass image for each day and drag the QR code, Name, Gate Time, and Allowed Entries into place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLayoutToOtherDays}
            className="h-9 px-3 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-xs font-medium text-[#26352e] inline-flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5 text-[#65726a]" />
            Copy layout to all days
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 rounded-lg bg-[#426b52] hover:bg-[#365a44] text-white text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : 'Save design'}
          </button>
        </div>
      </div>

      {/* Day 1 / Day 2 / Day 3 selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 bg-white border border-[#e2e8df] rounded-xl p-1">
          {dayKeys.map((idx) => {
            const hasImg = Boolean(configs[`day_${idx}`]?.bgUrl);
            const dateStr = eventDates[idx];
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveDay(idx)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-2 ${
                  activeDay === idx
                    ? 'bg-[#426b52] text-white'
                    : 'text-[#65726a] hover:text-[#26352e] hover:bg-[#f6f8f4]'
                }`}
              >
                <span>Day {idx + 1}</span>
                {dateStr && <span className="opacity-75 text-[11px]">({dateStr})</span>}
                {hasImg && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      activeDay === idx ? 'bg-white' : 'bg-[#426b52]'
                    }`}
                    title="Design uploaded"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[#65726a]" htmlFor="ep-sample-name">
            Preview name:
          </label>
          <input
            id="ep-sample-name"
            type="text"
            value={sampleName}
            onChange={(e) => setSampleName(e.target.value)}
            className="h-8 px-2.5 text-xs rounded-lg border border-[#e2e8df] bg-white text-[#26352e] w-40"
          />
        </div>
      </div>

      {/* Main Editor Stage + Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left: Live Drag Canvas */}
        <div className="xl:col-span-8 bg-white border border-[#e2e8df] rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(Object.keys(layerLabels) as ActiveLayer[]).map((key) => {
                const enabled = key === 'qr' || Boolean((current[key] as TextLayerConfig)?.enabled);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedLayer(key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                      selectedLayer === key
                        ? 'bg-[#eff4ed] border-[#426b52] text-[#26352e]'
                        : 'bg-[#fafbf9] border-[#e2e8df] text-[#65726a] hover:text-[#26352e]'
                    } ${!enabled ? 'opacity-50' : ''}`}
                  >
                    {layerLabels[key]}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <label className="h-8 px-3 rounded-lg border border-[#e2e8df] bg-[#fafbf9] hover:bg-[#eff4ed] text-xs font-medium text-[#26352e] cursor-pointer inline-flex items-center gap-1.5">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5 text-[#426b52]" />}
                {current.bgUrl ? `Change Day ${activeDay + 1} image` : `Upload Day ${activeDay + 1} image`}
                <input
                  type="file"
                  accept="image/*,.heic,.heif"
                  onChange={handleUploadBg}
                  className="hidden"
                />
              </label>
              {current.bgUrl && (
                <button
                  type="button"
                  onClick={() => updateDay({ bgUrl: '' })}
                  title="Remove background image"
                  aria-label="Remove background image"
                  className="h-8 w-8 rounded-lg border border-[#f2cfd3] bg-[#fdf2f3] text-[#b43c48] inline-flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {current.bgUrl ? (
            <div
              ref={stageRef}
              onPointerMove={(e) => {
                if (draggingLayer.current) moveLayerFromPointer(e.clientX, e.clientY);
              }}
              onPointerUp={() => {
                draggingLayer.current = null;
              }}
              onPointerLeave={() => {
                draggingLayer.current = null;
              }}
              className="relative w-full rounded-xl overflow-hidden border border-[#d6dfd2] bg-white shadow-sm select-none touch-none"
              style={{ aspectRatio: String(aspect) }}
            >
              <img
                src={current.bgUrl}
                alt={`Day ${activeDay + 1} pass background`}
                className="w-full h-full object-cover pointer-events-none"
              />

              {/* Draggable QR Code */}
              <div
                onPointerDown={(e) => {
                  e.stopPropagation();
                  draggingLayer.current = 'qr';
                  setSelectedLayer('qr');
                }}
                style={{
                  left: `${current.qr.x}%`,
                  top: `${current.qr.y}%`,
                  width: `${current.qr.size}%`,
                  aspectRatio: '1 / 1',
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute p-1 rounded cursor-move flex items-center justify-center ${
                  current.qr.transparentBg ? 'bg-transparent' : 'bg-white shadow-md'
                } ${
                  selectedLayer === 'qr' ? 'ring-2 ring-[#426b52] ring-offset-1' : 'ring-1 ring-black/10'
                }`}
              >
                <QRCodeSVG
                  value={`PREVIEW-PASS-D${activeDay + 1}`}
                  bgColor={current.qr.transparentBg ? 'transparent' : '#ffffff'}
                  style={{ width: '100%', height: '100%' }}
                  marginSize={0}
                  level="M"
                />
              </div>

              {/* Draggable Text Layers */}
              {(
                [
                  { key: 'name', text: sampleName || 'Guest Name' },
                  { key: 'gateTime', text: current.gateTime?.text || 'Gates Open: 5:00 PM' },
                  { key: 'allowedLimit', text: current.allowedLimit?.text || 'Admits 1 Person' },
                  { key: 'dateLabel', text: eventDates[activeDay] || '2026-03-20' },
                ] as const
              ).map(({ key, text }) => {
                const layer = current[key];
                if (!layer?.enabled) return null;
                const pxSize = Math.max(10, (stageWidth * (layer.fontSize || 2.5)) / 100);
                const tx =
                  layer.align === 'left' ? '0%' : layer.align === 'right' ? '-100%' : '-50%';

                return (
                  <div
                    key={key}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      draggingLayer.current = key;
                      setSelectedLayer(key);
                    }}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      transform: `translate(${tx}, -50%)`,
                      fontSize: `${pxSize}px`,
                      fontWeight: layer.bold ? 700 : 500,
                      fontFamily: layer.fontFamily ? `"${layer.fontFamily}", sans-serif` : 'sans-serif',
                      color: layer.color || '#111827',
                    }}
                    className={`absolute whitespace-nowrap px-1.5 py-0.5 rounded cursor-move leading-none ${
                      selectedLayer === key
                        ? 'outline-2 outline-dashed outline-[#426b52] bg-white/25'
                        : 'hover:outline hover:outline-dashed hover:outline-black/30'
                    }`}
                  >
                    {text}
                  </div>
                );
              })}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center py-16 px-6 rounded-xl border-2 border-dashed border-[#d6dfd2] bg-[#fafbf9] hover:bg-[#eff4ed]/60 cursor-pointer transition-colors">
              <ImagePlus className="w-10 h-10 text-[#426b52] mb-3" />
              <p className="text-sm font-semibold text-[#26352e]">
                Upload Day {activeDay + 1} pass background
              </p>
              <p className="text-xs text-[#65726a] mt-1 text-center max-w-md">
                Pick any PNG, JPG, or WebP pass artwork. Works with both wide ticket designs (2 stacked per A4) and vertical passes (2 side-by-side per A4).
              </p>
              <span className="mt-4 px-4 py-2 rounded-lg bg-[#426b52] text-white text-xs font-medium">
                {uploading ? 'Uploading...' : 'Choose image'}
              </span>
              <input
                type="file"
                accept="image/*,.heic,.heif"
                onChange={handleUploadBg}
                className="hidden"
              />
            </label>
          )}

          <p className="text-[11px] text-[#65726a]">
            Tip: Click and drag the QR code or text labels directly on the pass above, or fine-tune them using the controls on the right.
          </p>
        </div>

        {/* Right: Simple English Layer Controls */}
        <div className="xl:col-span-4 bg-white border border-[#e2e8df] rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-[#eef2ec] pb-3">
            <div className="flex items-center gap-2">
              {selectedLayer === 'qr' ? (
                <QrCode className="w-4 h-4 text-[#426b52]" />
              ) : selectedLayer === 'gateTime' ? (
                <Clock className="w-4 h-4 text-[#426b52]" />
              ) : selectedLayer === 'allowedLimit' ? (
                <Users className="w-4 h-4 text-[#426b52]" />
              ) : selectedLayer === 'dateLabel' ? (
                <Calendar className="w-4 h-4 text-[#426b52]" />
              ) : (
                <Type className="w-4 h-4 text-[#426b52]" />
              )}
              <h3 className="text-sm font-semibold text-[#26352e]">
                {layerLabels[selectedLayer]} settings
              </h3>
            </div>

            {selectedLayer !== 'qr' && activeTextLayer && (
              <label className="inline-flex items-center gap-2 text-xs text-[#26352e] cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeTextLayer.enabled}
                  onChange={(e) =>
                    updateTextLayer(selectedLayer, { enabled: e.target.checked })
                  }
                  className="accent-[#426b52]"
                />
                Show on pass
              </label>
            )}
          </div>

          {selectedLayer === 'qr' ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#4a5750]">Left / Right position</span>
                  <span className="font-mono text-[#26352e]">{current.qr.x}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={95}
                  step={0.5}
                  value={current.qr.x}
                  onChange={(e) => updateDay({ qr: { ...current.qr, x: Number(e.target.value) } })}
                  className="w-full accent-[#426b52]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#4a5750]">Top / Bottom position</span>
                  <span className="font-mono text-[#26352e]">{current.qr.y}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={95}
                  step={0.5}
                  value={current.qr.y}
                  onChange={(e) => updateDay({ qr: { ...current.qr, y: Number(e.target.value) } })}
                  className="w-full accent-[#426b52]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#4a5750]">QR code size</span>
                  <span className="font-mono text-[#26352e]">{current.qr.size}%</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={60}
                  step={0.5}
                  value={current.qr.size}
                  onChange={(e) =>
                    updateDay({ qr: { ...current.qr, size: Number(e.target.value) } })
                  }
                  className="w-full accent-[#426b52]"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-[#26352e] pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!current.qr.transparentBg}
                  onChange={(e) =>
                    updateDay({ qr: { ...current.qr, transparentBg: !e.target.checked } })
                  }
                  className="accent-[#426b52]"
                />
                White box behind QR code
              </label>
            </div>
          ) : activeTextLayer ? (
            <div className="space-y-4">
              {(selectedLayer === 'gateTime' || selectedLayer === 'allowedLimit') && (
                <div>
                  <label className="block text-xs font-medium text-[#26352e] mb-1">
                    {selectedLayer === 'gateTime' ? 'Gate timing text' : 'Allowed entry text'}
                  </label>
                  <input
                    type="text"
                    value={activeTextLayer.text || ''}
                    onChange={(e) => updateTextLayer(selectedLayer, { text: e.target.value })}
                    placeholder={
                      selectedLayer === 'gateTime'
                        ? 'e.g. Gates Open: 5:00 PM - 8:30 PM'
                        : 'e.g. Admits 1 Person'
                    }
                    className="w-full h-9 px-3 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e] focus:outline-none focus:border-[#426b52] focus:bg-white"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#4a5750]">Left / Right position</span>
                  <span className="font-mono text-[#26352e]">{activeTextLayer.x}%</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={98}
                  step={0.5}
                  value={activeTextLayer.x}
                  onChange={(e) =>
                    updateTextLayer(selectedLayer, { x: Number(e.target.value) })
                  }
                  className="w-full accent-[#426b52]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#4a5750]">Top / Bottom position</span>
                  <span className="font-mono text-[#26352e]">{activeTextLayer.y}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={95}
                  step={0.5}
                  value={activeTextLayer.y}
                  onChange={(e) =>
                    updateTextLayer(selectedLayer, { y: Number(e.target.value) })
                  }
                  className="w-full accent-[#426b52]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#4a5750]">Text size</span>
                  <span className="font-mono text-[#26352e]">{activeTextLayer.fontSize}%</span>
                </div>
                <input
                  type="range"
                  min={1.2}
                  max={8}
                  step={0.1}
                  value={activeTextLayer.fontSize}
                  onChange={(e) =>
                    updateTextLayer(selectedLayer, { fontSize: Number(e.target.value) })
                  }
                  className="w-full accent-[#426b52]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#4a5750] mb-1">Text color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeTextLayer.color || '#111827'}
                      onChange={(e) =>
                        updateTextLayer(selectedLayer, { color: e.target.value })
                      }
                      className="h-8 w-10 rounded border border-[#e2e8df] cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-[#65726a]">
                      {activeTextLayer.color}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#4a5750] mb-1">Font style</label>
                  <select
                    value={activeTextLayer.fontFamily || ''}
                    onChange={(e) =>
                      updateTextLayer(selectedLayer, { fontFamily: e.target.value || undefined })
                    }
                    className="w-full h-8 px-2 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e]"
                  >
                    <option value="">Clean Sans</option>
                    <option value="Anton">Anton (Display)</option>
                    <option value="Orbitron">Orbitron (Modern)</option>
                    <option value="Rajdhani">Rajdhani (Tech)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#eef2ec]">
                <div className="inline-flex rounded-lg border border-[#e2e8df] overflow-hidden">
                  {(
                    [
                      { id: 'left', icon: AlignLeft },
                      { id: 'center', icon: AlignCenter },
                      { id: 'right', icon: AlignRight },
                    ] as const
                  ).map(({ id, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => updateTextLayer(selectedLayer, { align: id })}
                      aria-label={`Align ${id}`}
                      className={`p-2 ${
                        activeTextLayer.align === id
                          ? 'bg-[#eff4ed] text-[#426b52]'
                          : 'bg-white text-[#65726a] hover:bg-[#f6f8f4]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateTextLayer(selectedLayer, { bold: !activeTextLayer.bold })
                  }
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1 ${
                    activeTextLayer.bold
                      ? 'bg-[#eff4ed] border-[#426b52] text-[#26352e]'
                      : 'bg-white border-[#e2e8df] text-[#65726a]'
                  }`}
                >
                  <Bold className="w-3.5 h-3.5" />
                  Bold
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
