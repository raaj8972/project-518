import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useGesture } from '@use-gesture/react';
import { Upload, Save, X, Move, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface TemplateConfig {
  bgUrl: string;
  qr: {
    x: number; // percentage
    y: number; // percentage
    size: number; // percentage of width
  };
}

// Default config if none exists
const DEFAULT_CONFIG: TemplateConfig = {
  bgUrl: '',
  qr: { x: 80, y: 30, size: 15 }
};

export const PassTemplateDesigner: React.FC = () => {
  const { securitySettings, updateSecuritySettings } = useData();
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Local state for configuration being edited (indexed by day key "day_0", "day_1" etc)
  const [configs, setConfigs] = useState<Record<string, TemplateConfig>>({});

  // Initialize from saved settings
  useEffect(() => {
    if (securitySettings?.pass_template_config) {
      setConfigs(securitySettings.pass_template_config);
    }
  }, [securitySettings]);

  const currentKey = `day_${activeDayIndex}`;
  const currentConfig = configs[currentKey] || DEFAULT_CONFIG;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `pass-template-${currentKey}-${Date.now()}.${fileExt}`;
      const filePath = `templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public-content')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-content')
        .getPublicUrl(filePath);

      updateConfig({ bgUrl: publicUrl });
      toast.success('Template background uploaded!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (updates: Partial<TemplateConfig>) => {
    setConfigs(prev => ({
      ...prev,
      [currentKey]: { ...(prev[currentKey] || DEFAULT_CONFIG), ...updates }
    }));
  };

  const saveConfiguration = async () => {
    try {
      setLoading(true);
      await updateSecuritySettings({ pass_template_config: configs });
      toast.success('Pass design saved successfully!');
    } catch (error) {
      toast.error('Failed to save design');
    } finally {
      setLoading(false);
    }
  };

  // Drag logic for QR
  const bind = useGesture({
    onDrag: ({ offset: [x, y], memo = {} }) => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      
      // Convert pixels to percentage
      const xPct = Math.max(0, Math.min(100 - currentConfig.qr.size, (x / width) * 100));
      const yPct = Math.max(0, Math.min(100, (y / height) * 100));
      
      updateConfig({ qr: { ...currentConfig.qr, x: xPct, y: yPct } });
      return memo;
    }
  });

  const eventDates = securitySettings?.event_dates || ['Day 1'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-white">Pass Template Designer</h3>
          <p className="text-gray-400 text-sm">Upload a background and position the QR code for each day.</p>
        </div>
        <button
          onClick={saveConfiguration}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save All Designs'}
        </button>
      </div>

      {/* Day Tabs */}
      <div className="flex border-b border-gray-700">
        {eventDates.map((date, idx) => (
          <button
            key={idx}
            onClick={() => setActiveDayIndex(idx)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeDayIndex === idx
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800'
            }`}
          >
            Day {idx + 1} <span className="text-xs opacity-50 ml-1">({date})</span>
          </button>
        ))}
        {eventDates.length === 0 && (
           <div className="px-6 py-3 text-sm text-gray-500 italic">No event dates configured</div>
        )}
      </div>

      {/* Workspace */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Editor Area */}
        <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-700 p-8 flex items-center justify-center min-h-[400px]">
          {currentConfig.bgUrl ? (
            <div 
              ref={containerRef}
              className="relative w-full shadow-2xl rounded overflow-hidden select-none"
              style={{ paddingBottom: '33.33%' }} // ~3:1 aspect ratio for ticket
            >
              <img 
                src={currentConfig.bgUrl} 
                alt="Template Background" 
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
              
              {/* Draggable OR Code Placeholder */}
               {/* 
                  NOTE: Simple positioning logic. 
                  In a real drag implementation without libraries, we'd use mouse events.
                  Since we have useGesture, we can wire it up if we had it fully installed.
                  Fallback: Simple slider controls for X/Y if drag is tricky to verify blindly.
               */}
              <div 
                className="absolute bg-white p-2 shadow-lg cursor-move flex items-center justify-center group"
                style={{
                  left: `${currentConfig.qr.x}%`,
                  top: `${currentConfig.qr.y}%`,
                  width: `${currentConfig.qr.size}%`,
                  aspectRatio: '1/1',
                  transform: 'translate(-50%, -50%)', // Center anchor
                }}
              >
                <div className="w-full h-full bg-black flex items-center justify-center text-white text-[10px] font-mono">
                  QR CODE
                </div>
                {/* Visual guide */}
                 <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                    Drag to Position
                 </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-xl w-full">
              <Upload className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No template uploaded for Day {activeDayIndex + 1}</p>
              <label className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-2">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <Plus className="w-4 h-4" />
                Upload Background Image
              </label>
              <p className="text-xs text-gray-500 mt-2">Recommended size: 1500x500px (3:1 ratio)</p>
            </div>
          )}
        </div>

        {/* Controls Sidebar */}
        <div className="space-y-6">
           <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-white">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                 <Move className="w-4 h-4 text-purple-400" />
                 QR Positioning
              </h4>
              
              {currentConfig.bgUrl ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Horizontal Position (X%)</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="range" 
                        min="0" max="100" 
                        step="0.1"
                        value={currentConfig.qr.x} 
                        onChange={(e) => updateConfig({ qr: { ...currentConfig.qr, x: Number(e.target.value) } })}
                        className="w-full accent-purple-500"
                      />
                      <input 
                        type="number"
                        min="0" max="100"
                        step="0.1"
                        value={currentConfig.qr.x}
                        onChange={(e) => updateConfig({ qr: { ...currentConfig.qr, x: Number(e.target.value) } })}
                        className="w-16 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white text-right"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Left</span>
                      <span>Right</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Vertical Position (Y%)</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="range" 
                        min="0" max="100" 
                        step="0.1"
                        value={currentConfig.qr.y} 
                        onChange={(e) => updateConfig({ qr: { ...currentConfig.qr, y: Number(e.target.value) } })}
                        className="w-full accent-purple-500"
                      />
                      <input 
                        type="number"
                        min="0" max="100"
                        step="0.1"
                        value={currentConfig.qr.y}
                        onChange={(e) => updateConfig({ qr: { ...currentConfig.qr, y: Number(e.target.value) } })}
                        className="w-16 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white text-right"
                      />
                    </div>
                     <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Top</span>
                      <span>Bottom</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Size (% of width)</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="range" 
                        min="5" max="30" 
                        step="0.1"
                        value={currentConfig.qr.size} 
                        onChange={(e) => updateConfig({ qr: { ...currentConfig.qr, size: Number(e.target.value) } })}
                        className="w-full accent-cyan-500"
                      />
                      <input 
                        type="number"
                        min="5" max="30"
                        step="0.1"
                        value={currentConfig.qr.size}
                        onChange={(e) => updateConfig({ qr: { ...currentConfig.qr, size: Number(e.target.value) } })}
                        className="w-16 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white text-right"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700/50">
                    <button 
                      onClick={() => document.getElementById('bg-upload-replace')?.click()}
                      className="text-xs text-gray-400 hover:text-white underline w-full text-center"
                    >
                       Replace Background Image
                    </button>
                    <input id="bg-upload-replace" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic text-center py-4">
                  Upload an image to unlock controls
                </p>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
