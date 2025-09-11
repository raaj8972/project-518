import React, { useState } from 'react';
import { Save, X, Monitor, Image as ImageIcon, Video, AlertCircle, Type, FileText, Plus, Trash2, ExternalLink, ArrowUp, ArrowDown } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';

export const HomepageManagement: React.FC = () => {
  const { homepageSettings, updateHomepageSettings } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  type SponsorLogo = {
    id: string;
    name: string;
    logo_url: string;
    website?: string;
    enabled: boolean;
    order: number;
  };
  
  type FormState = {
    hero_media_url: string;
    hero_media_type: 'image' | 'video';
    hero_title: string;
    hero_subtitle: string;
    hero_description: string;
    sponsor_logos: SponsorLogo[];
    sponsor_section_enabled: boolean;
    sponsor_section_text: string;
    featured_partners_enabled: boolean;
    show_faculty_heads: boolean;
    show_committee_heads: boolean;
    partners_carousel_speed_ms: number;
    leadership_carousel_speed_ms: number;
  };
  
  const [form, setForm] = useState<FormState>({
    hero_media_url: homepageSettings?.hero_media_url || '',
    hero_media_type: homepageSettings?.hero_media_type || 'image' as 'image' | 'video',
    hero_title: homepageSettings?.hero_title || 'RICORRENZA',
    hero_subtitle: homepageSettings?.hero_subtitle || 'Experience the Future',
    hero_description: homepageSettings?.hero_description || 'Experience the future of Healthcare, Technology, and Creativity',
    sponsor_logos: (homepageSettings?.sponsor_logos as SponsorLogo[]) || [],
    sponsor_section_enabled: homepageSettings?.sponsor_section_enabled || false,
    sponsor_section_text: homepageSettings?.sponsor_section_text || 'Powered by',
    featured_partners_enabled: homepageSettings?.featured_partners_enabled ?? true,
    show_faculty_heads: homepageSettings?.show_faculty_heads ?? true,
    show_committee_heads: homepageSettings?.show_committee_heads ?? true,
    partners_carousel_speed_ms: homepageSettings?.partners_carousel_speed_ms ?? 3000,
    leadership_carousel_speed_ms: homepageSettings?.leadership_carousel_speed_ms ?? 2500
  });

  const handleSave = async () => {
    try {
      await updateHomepageSettings(form);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Homepage settings updated successfully!' });
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Error updating homepage settings:', error);
  const errText = (error as any)?.message || 'Failed to update homepage settings. Please try again.';
  setMessage({ type: 'error', text: errText });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleCancel = () => {
    setForm({
      hero_media_url: homepageSettings?.hero_media_url || '',
      hero_media_type: homepageSettings?.hero_media_type || 'image',
      hero_title: homepageSettings?.hero_title || 'RICORRENZA',
      hero_subtitle: homepageSettings?.hero_subtitle || 'Experience the Future',
      hero_description: homepageSettings?.hero_description || 'Experience the future of Healthcare, Technology, and Creativity',
      sponsor_logos: (homepageSettings?.sponsor_logos as SponsorLogo[]) || [],
      sponsor_section_enabled: homepageSettings?.sponsor_section_enabled || false,
      sponsor_section_text: homepageSettings?.sponsor_section_text || 'Powered by',
      featured_partners_enabled: homepageSettings?.featured_partners_enabled ?? true,
      show_faculty_heads: homepageSettings?.show_faculty_heads ?? true,
      show_committee_heads: homepageSettings?.show_committee_heads ?? true,
      partners_carousel_speed_ms: homepageSettings?.partners_carousel_speed_ms ?? 3000,
      leadership_carousel_speed_ms: homepageSettings?.leadership_carousel_speed_ms ?? 2500
    });
    setIsEditing(false);
    setMessage(null);
  };

  const handleMediaSelect = (url: string) => {
    setForm(prev => ({ ...prev, hero_media_url: url }));
  };

  const clearMedia = () => {
    setForm(prev => ({ ...prev, hero_media_url: '' }));
  };

  const addSponsorLogo = () => {
    const newLogo: SponsorLogo = {
      id: `sponsor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      logo_url: '',
      website: '',
      enabled: true,
      order: form.sponsor_logos.length + 1
    };
    setForm(prev => ({
      ...prev,
      sponsor_logos: [...prev.sponsor_logos, newLogo]
    }));
  };

  const updateSponsorLogo = (id: string, updates: Partial<SponsorLogo>) => {
    setForm(prev => ({
      ...prev,
      sponsor_logos: prev.sponsor_logos.map((logo: SponsorLogo) => 
        logo.id === id ? { ...logo, ...updates } : logo
      )
    }));
  };

  const removeSponsorLogo = (id: string) => {
    setForm(prev => ({
      ...prev,
      sponsor_logos: prev.sponsor_logos.filter((logo: SponsorLogo) => logo.id !== id)
    }));
  };

  const moveSponsorLogo = (id: string, direction: 'up' | 'down') => {
    const currentIndex = form.sponsor_logos.findIndex((logo: SponsorLogo) => logo.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= form.sponsor_logos.length) return;

    const newLogos = [...form.sponsor_logos];
    [newLogos[currentIndex], newLogos[newIndex]] = [newLogos[newIndex], newLogos[currentIndex]];
    
    // Update order values
  newLogos.forEach((logo: SponsorLogo, index: number) => {
      logo.order = index + 1;
    });

    setForm(prev => ({ ...prev, sponsor_logos: newLogos }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Homepage Management</h2>
          <p className="text-gray-600">Customize the hero section background and content</p>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 flex items-center transition-colors"
        >
          {isEditing ? (
            <>
              <X size={16} className="mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Edit Homepage
            </>
          )}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg p-4 flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <Save className="w-5 h-5 text-green-500 mr-3" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          )}
          <span className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {message.text}
          </span>
        </div>
      )}

      {/* Current Settings Display */}
      {!isEditing && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Current Homepage Settings</h3>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Hero Content */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Title</label>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <span className="text-gray-900 font-semibold">{homepageSettings?.hero_title || 'RICORRENZA'}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Subtitle</label>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <span className="text-gray-900">{homepageSettings?.hero_subtitle || 'Experience the Future'}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Description</label>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <span className="text-gray-900">{homepageSettings?.hero_description || 'Experience the future of Healthcare, Technology, and Creativity'}</span>
                </div>
              </div>
            </div>

            {/* Hero Media */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hero Background Media</label>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Media Type:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    homepageSettings?.hero_media_type === 'video' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {homepageSettings?.hero_media_type === 'video' ? (
                      <>
                        <Video size={12} className="mr-1" />
                        Video
                      </>
                    ) : (
                      <>
                        <ImageIcon size={12} className="mr-1" />
                        Image
                      </>
                    )}
                  </span>
                </div>
                
                {homepageSettings?.hero_media_url ? (
                  <div className="space-y-3">
                    {homepageSettings.hero_media_type === 'video' ? (
                      <video
                        src={homepageSettings.hero_media_url}
                        className="w-full h-32 object-cover rounded-lg border"
                        controls
                        muted
                      />
                    ) : (
                      <img
                        src={homepageSettings.hero_media_url}
                        alt="Hero background"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    )}
                    <div className="text-xs text-gray-500 break-all">
                      {homepageSettings.hero_media_url}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Monitor size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No background media set</p>
                    <p className="text-xs">Using default background</p>
                  </div>
                )}
              </div>
              
              {/* Sponsor Logos Preview (from settings) */}
              {homepageSettings?.sponsor_section_enabled && Array.isArray(homepageSettings?.sponsor_logos) && (homepageSettings?.sponsor_logos as SponsorLogo[]).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <p className="text-xs text-gray-500 mb-2">{homepageSettings.sponsor_section_text}</p>
                  <div className="flex flex-wrap justify-center items-center gap-4">
                    {(homepageSettings.sponsor_logos as SponsorLogo[])
                      .filter((logo: SponsorLogo) => logo.enabled && !!logo.logo_url)
                      .sort((a: SponsorLogo, b: SponsorLogo) => a.order - b.order)
                      .map((logo: SponsorLogo) => (
                        <img key={logo.id} src={logo.logo_url} alt={logo.name} className="h-8 opacity-80" />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-400">
          <h3 className="text-lg font-semibold mb-6">Edit Homepage Settings</h3>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Hero Content Form */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Title</label>
                <div className="relative">
                  <Type className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={form.hero_title}
                    onChange={(e) => setForm(prev => ({ ...prev, hero_title: e.target.value }))}
                    placeholder="RICORRENZA"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Main title displayed on the homepage</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Subtitle</label>
                <div className="relative">
                  <Type className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={form.hero_subtitle}
                    onChange={(e) => setForm(prev => ({ ...prev, hero_subtitle: e.target.value }))}
                    placeholder="Experience the Future"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Subtitle text below the main title</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Description</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={form.hero_description}
                    onChange={(e) => setForm(prev => ({ ...prev, hero_description: e.target.value }))}
                    placeholder="Experience the future of Healthcare, Technology, and Creativity"
                    rows={4}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Descriptive text below the subtitle</p>
              </div>
            </div>

            {/* Hero Media Form */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Background Media Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, hero_media_type: 'image' }))}
                    className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                      form.hero_media_type === 'image'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                    <div className="text-sm font-medium">Image</div>
                    <div className="text-xs text-gray-500">Static background image</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, hero_media_type: 'video' }))}
                    className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                      form.hero_media_type === 'video'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Video className="w-8 h-8 mx-auto mb-2" />
                    <div className="text-sm font-medium">Video</div>
                    <div className="text-xs text-gray-500">Animated background video</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background {form.hero_media_type === 'video' ? 'Video' : 'Image'}
                </label>
                <ImageUpload
                  onImageSelect={handleMediaSelect}
                  currentImage={form.hero_media_url}
                  bucket="hero-video"
                  folder="background"
                  acceptedTypes={form.hero_media_type === 'video' ? 'video/mp4,video/quicktime,video/webm' : 'image/*'}
                  fileTypeLabel={
                    form.hero_media_type === 'video' 
                      ? 'MP4 / MOV / WEBM up to 80MB' 
                      : 'PNG, JPG, WEBP, GIF up to 5MB'
                  }
                />
                <p className="text-xs text-gray-500 mt-2">
                  {form.hero_media_type === 'video' 
                    ? 'Upload a video file for an animated background. Recommended: 1920x1080, MP4 format, under 50MB'
                    : 'Upload an image for the hero background. Recommended: 1920x1080 or higher resolution'
                  }
                </p>
                
                {form.hero_media_url && (
                  <button
                    type="button"
                    onClick={clearMedia}
                    className="mt-2 text-red-600 hover:text-red-800 text-sm flex items-center"
                  >
                    <X size={14} className="mr-1" />
                    Remove Media
                  </button>
                )}
              </div>

              {/* Preview */}
              {form.hero_media_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {form.hero_media_type === 'video' ? (
                      <video
                        src={form.hero_media_url}
                        className="w-full h-48 object-cover"
                        controls
                        muted
                        loop
                      />
                    ) : (
                      <img
                        src={form.hero_media_url}
                        alt="Hero background preview"
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-3 bg-gray-50">
                      <div className="text-center">
                        <h4 className="text-lg font-bold text-gray-900 mb-1">{form.hero_title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{form.hero_subtitle}</p>
                        <p className="text-xs text-gray-500">{form.hero_description}</p>
                      </div>
                      
                      {/* Sponsor Logo Preview */}
                      {homepageSettings?.sponsor_section_enabled && homepageSettings?.sponsor_logos && homepageSettings.sponsor_logos.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-2">{homepageSettings.sponsor_section_text}</p>
                          <div className="flex flex-wrap justify-center items-center gap-4">
                            {(homepageSettings.sponsor_logos as SponsorLogo[])
                              .filter((logo: SponsorLogo) => logo.enabled)
                              .sort((a: SponsorLogo, b: SponsorLogo) => a.order - b.order)
                              .map((logo: SponsorLogo) => (
                                <img
                                  key={logo.id}
                                  src={logo.logo_url}
                                  alt={logo.name}
                                  className="h-8 opacity-80"
                                />
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Carousel & Sections Settings */}
          <div className="space-y-6 lg:col-span-2">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Homepage Sections & Animation</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                <label className="block text-sm font-medium text-gray-700">Partners Carousel Speed (ms)</label>
                <input
                  type="number"
                  min={1000}
                  step={100}
                  value={form.partners_carousel_speed_ms}
                  onChange={(e) => setForm(prev => ({ ...prev, partners_carousel_speed_ms: parseInt(e.target.value) || 3000 }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <label className="block text-sm font-medium text-gray-700 mt-3">Show Partners Carousel</label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={form.featured_partners_enabled}
                    onChange={(e) => setForm(prev => ({ ...prev, featured_partners_enabled: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Enable “Our Partners” section</span>
                </label>
              </div>

              <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                <label className="block text-sm font-medium text-gray-700">Leadership Carousel Speed (ms)</label>
                <input
                  type="number"
                  min={1000}
                  step={100}
                  value={form.leadership_carousel_speed_ms}
                  onChange={(e) => setForm(prev => ({ ...prev, leadership_carousel_speed_ms: parseInt(e.target.value) || 2500 }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="mt-3 space-y-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={form.show_faculty_heads}
                      onChange={(e) => setForm(prev => ({ ...prev, show_faculty_heads: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Show Faculty Heads</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={form.show_committee_heads}
                      onChange={(e) => setForm(prev => ({ ...prev, show_committee_heads: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Show Committee Heads</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Sponsor Logo Settings */}
          <div className="space-y-6 lg:col-span-2">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Sponsor Logos Settings</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <input
                  type="checkbox"
                  checked={form.sponsor_section_enabled}
                  onChange={(e) => setForm(prev => ({ ...prev, sponsor_section_enabled: e.target.checked }))}
                  className="mr-2"
                />
                Show sponsor logos section on homepage
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Toggle to display sponsor logos at the bottom of the hero section.
              </p>
            </div>

            {form.sponsor_section_enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsor Section Text
                  </label>
                  <div className="relative">
                    <Type className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={form.sponsor_section_text}
                      onChange={(e) => setForm(prev => ({ ...prev, sponsor_section_text: e.target.value }))}
                      placeholder="Powered by"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Text displayed above the sponsor logos (e.g., "Powered by", "Sponsored by").
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsor Logos
                  </label>
                  
                  <div className="space-y-4">
                    {form.sponsor_logos.map((logo: SponsorLogo, index: number) => (
                      <div key={logo.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-900">Sponsor {index + 1}</h5>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => moveSponsorLogo(logo.id, 'up')}
                              disabled={index === 0}
                              className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSponsorLogo(logo.id, 'down')}
                              disabled={index === form.sponsor_logos.length - 1}
                              className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              <ArrowDown size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSponsorLogo(logo.id)}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Remove sponsor"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Sponsor Name</label>
                              <input
                                type="text"
                                value={logo.name}
                                onChange={(e) => updateSponsorLogo(logo.id, { name: e.target.value })}
                                placeholder="Sponsor name"
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Website URL (Optional)</label>
                              <input
                                type="url"
                                value={logo.website || ''}
                                onChange={(e) => updateSponsorLogo(logo.id, { website: e.target.value })}
                                placeholder="https://sponsor-website.com"
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={logo.enabled}
                                onChange={(e) => updateSponsorLogo(logo.id, { enabled: e.target.checked })}
                                className="mr-2"
                              />
                              <label className="text-xs font-medium text-gray-700">
                                Show on homepage
                              </label>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Logo Image</label>
                            <ImageUpload
                              onImageSelect={(url) => updateSponsorLogo(logo.id, { logo_url: url })}
                              currentImage={logo.logo_url}
                              bucket="sponsor-logos"
                              folder="homepage-sponsors"
                              acceptedTypes="image/*"
                              fileTypeLabel="PNG, JPG, GIF up to 5MB"
                              className="h-24"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={addSponsorLogo}
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center text-gray-600 hover:text-blue-600"
                    >
                      <Plus size={20} className="mr-2" />
                      Add Sponsor Logo
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Add multiple sponsor logos to display on the homepage. Recommended: transparent background, high resolution.
                  </p>
                  
                  {/* Preview of sponsor logos */}
                  {form.sponsor_logos.filter((logo: SponsorLogo) => logo.enabled && logo.logo_url).length > 0 && (
                    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                      <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-2">{form.sponsor_section_text}</p>
                        <div className="flex flex-wrap justify-center items-center gap-4">
                          {form.sponsor_logos
                            .filter((logo: SponsorLogo) => logo.enabled && logo.logo_url)
                            .sort((a: SponsorLogo, b: SponsorLogo) => a.order - b.order)
                            .map((logo: SponsorLogo) => (
                              <div key={logo.id} className="flex flex-col items-center">
                                <img
                                  src={logo.logo_url}
                                  alt={logo.name}
                                  className="h-8 opacity-80 mb-1"
                                />
                                {logo.website && (
                                  <ExternalLink size={12} className="text-gray-400" />
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Save/Cancel Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 flex items-center"
            >
              <X size={16} className="mr-2" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 flex items-center transition-colors"
            >
              <Save size={16} className="mr-2" />
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Usage Instructions</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span><strong>Background Images:</strong> Use high-resolution images (1920x1080 or higher) for best quality</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span><strong>Background Videos:</strong> Use MP4 format, keep file size under 50MB for faster loading</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span><strong>Sponsor Logos:</strong> Use transparent background logos for best appearance on dark backgrounds</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span><strong>Text Content:</strong> Keep titles concise and descriptions engaging for better user experience</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span><strong>Preview:</strong> Changes will be visible on the homepage immediately after saving</span>
          </div>
        </div>
      </div>

      {/* Current Media Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Media Information</h3>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-500 mb-1">
              {homepageSettings?.hero_media_type === 'video' ? 'Video' : 'Image'}
            </div>
            <div className="text-gray-600 text-sm">Current Media Type</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-500 mb-1">
              {homepageSettings?.hero_media_url ? 'Set' : 'Default'}
            </div>
            <div className="text-gray-600 text-sm">Background Status</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-500 mb-1">
              {homepageSettings?.sponsor_logos?.length || 0}
            </div>
            <div className="text-gray-600 text-sm">Total Sponsor Logos</div>
          </div>
        </div>
      </div>
    </div>
  );
};