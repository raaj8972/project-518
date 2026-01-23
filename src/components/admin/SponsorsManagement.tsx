import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Building, Star, Eye, EyeOff, ExternalLink, Download, Mail, Award, Link as LinkIcon, FileText, ArrowUp, ArrowDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import type { Sponsor, SponsorshipPackage, ContactSection } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';
import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';

type SubTabType = 'sponsors' | 'packages' | 'settings';

export const SponsorsManagement: React.FC = () => {
  const { 
    sponsors, 
    sponsorshipPackages,
    sponsorshipSettings,
    addSponsor, 
    updateSponsor, 
    deleteSponsor,
    toggleSponsorFeatured,
    addSponsorshipPackage,
    updateSponsorshipPackage,
    deleteSponsorshipPackage,
    toggleSponsorshipPackageEnabled,
    updateSponsorshipSettings,
    addContactSection,
    updateContactSection,
    deleteContactSection
  } = useData();
  const savingProgress = useSavingProgress();
  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    checkRequiresApproval().then(setRequiresApproval);
  }, []);

  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('sponsors');
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  const [editingPackage, setEditingPackage] = useState<number | null>(null);
  // Track if the admin has manually chosen an icon so we don't override with auto-suggestions
  const [packageIconTouched, setPackageIconTouched] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<number | null>(null);
  const [brochureMode, setBrochureMode] = useState<'upload' | 'url'>('upload');

  const [form, setForm] = useLocalStorage('admin_sponsor_form_draft', {
    name: '',
    category: '',
    logo: '',
    description: '',
    website: '',
    featured: false,
    order_position: 1
  });

  const [packageForm, setPackageForm] = useLocalStorage('admin_sponsor_package_form_draft', {
    tier: '',
    price: '',
    color: 'from-gray-500 to-gray-600',
    icon: 'Award',
    benefits: [] as string[],
    order_position: 1,
    enabled: true
  });

  const [settingsForm, setSettingsForm] = useLocalStorage('admin_sponsorship_settings_draft', {
    page_title: (sponsorshipSettings as any)?.page_title || 'OUR SPONSORS',
    intro_text: sponsorshipSettings?.intro_text || `${BRAND_NAME} ${BRAND_YEAR} is made possible by the generous support of our sponsors.`,
    call_to_action_text: sponsorshipSettings?.call_to_action_text || 'Interested in Sponsoring?',
    brochure_url: sponsorshipSettings?.brochure_url || '',
    brochure_title: sponsorshipSettings?.brochure_title || 'Download Sponsorship Brochure'
  });

  const [contactForm, setContactForm] = useLocalStorage('admin_sponsor_contact_form_draft', {
    type: 'email' as 'email' | 'phone' | 'address' | 'custom',
    title: '',
    content: '',
    icon: 'Mail',
    enabled: true,
    order: 0
  });

  // If there is no saved settings draft and settings exist from server, hydrate them once
  useEffect(() => {
    try {
      if (!localStorage.getItem('admin_sponsorship_settings_draft') && sponsorshipSettings) {
        setSettingsForm({
          page_title: (sponsorshipSettings as any)?.page_title || 'OUR SPONSORS',
          intro_text: sponsorshipSettings.intro_text || `${BRAND_NAME} ${BRAND_YEAR} is made possible by the generous support of our sponsors.`,
          call_to_action_text: sponsorshipSettings.call_to_action_text || 'Interested in Sponsoring?',
          brochure_url: sponsorshipSettings.brochure_url || '',
          brochure_title: sponsorshipSettings.brochure_title || 'Download Sponsorship Brochure'
        });
      }
    } catch {}
  }, [sponsorshipSettings, setSettingsForm]);

  // Create dynamic categories based on sponsorship packages
  const getAvailableCategories = () => {
    const fixedCategories = ['Title Sponsor', 'Co Sponsor'];
    const packageTiers = sponsorshipPackages
      .filter(pkg => pkg.enabled)
      .map(pkg => pkg.tier)
      .sort((a, b) => {
        // Sort by typical sponsorship hierarchy
        const hierarchy = ['Platinum', 'Gold', 'Silver', 'Bronze'];
        const aIndex = hierarchy.findIndex(h => a.toLowerCase().includes(h.toLowerCase()));
        const bIndex = hierarchy.findIndex(h => b.toLowerCase().includes(h.toLowerCase()));
        
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });
    
    return [...fixedCategories, ...packageTiers];
  };

  // Dedupe categories derived from packages to avoid duplicate labels
  const availableCategories = Array.from(new Set(getAvailableCategories()));
  // Include any categories present on sponsors that are not in available (package-derived) categories
  const sponsorCategories = Array.from(new Set(sponsors.map((s) => s.category)));
  const missingCategories = sponsorCategories.filter((c) => !availableCategories.includes(c));
  // Merge and dedupe combined categories (package-derived first, then any sponsor-only categories)
  const allCategories = Array.from(new Set([...availableCategories, ...missingCategories]));

  const getIconComponent = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || Award;
  };

  const resetForm = () => {
    setForm({
      name: '',
      category: availableCategories.length > 0 ? availableCategories[0] : '',
      logo: '',
      description: '',
      website: '',
      featured: false,
      order_position: sponsors.length + 1
    });
  };

  const resetPackageForm = () => {
    setPackageForm({
      tier: '',
      price: '',
      color: 'from-gray-500 to-gray-600',
      icon: 'Award',
      benefits: [],
      order_position: sponsorshipPackages.length + 1,
      enabled: true
    });
    setPackageIconTouched(false);
  };

  const resetContactForm = () => {
    setContactForm({
      type: 'email',
      title: '',
      content: '',
      icon: 'Mail',
      enabled: true,
      order: (sponsorshipSettings?.contactSections?.length || 0) + 1
    });
  };

  const handleAdd = async () => {
    if (!form.name || !form.category || !form.logo) {
      alert('Please fill in all required fields (name, category, and logo)');
      return;
    }
    
    try {
      if (requiresApproval) {
        const result = await submitForApproval('sponsor', 'create', form);
        if (result.success) {
          alert('Request submitted for approval. An owner will review your changes.');
          setIsAdding(false);
          resetForm();
          try { localStorage.removeItem('admin_sponsor_form_draft'); } catch {}
        } else {
          alert(`Failed to submit for approval: ${result.error}`);
        }
      } else {
        await addSponsor(form);
        setIsAdding(false);
        resetForm();
        try { localStorage.removeItem('admin_sponsor_form_draft'); } catch {}
      }
    } catch (error) {
      console.error('Error adding sponsor:', error);
      alert('Failed to add sponsor. Please try again.');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!form.name || !form.category || !form.logo) {
      alert('Please fill in all required fields (name, category, and logo)');
      return;
    }
    
    try {
      if (requiresApproval) {
        const result = await submitForApproval('sponsor', 'update', form, id);
        if (result.success) {
          alert('Request submitted for approval. An owner will review your changes.');
          setEditing(null);
          resetForm();
          try { localStorage.removeItem('admin_sponsor_form_draft'); } catch {}
        } else {
          alert(`Failed to submit for approval: ${result.error}`);
        }
      } else {
        const steps = savingProgress.withSteps(3, 'Preparing…');
        steps.next('Validating');
        await updateSponsor(id, form);
        steps.next('Finalizing');
        setEditing(null);
        resetForm();
        try { localStorage.removeItem('admin_sponsor_form_draft'); } catch {}
        savingProgress.done();
      }
    } catch (error) {
      console.error('Error updating sponsor:', error);
      alert('Failed to update sponsor. Please try again.');
      savingProgress.done();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this sponsor? This action cannot be undone.')) {
      try {
        if (requiresApproval) {
          const result = await submitForApproval('sponsor', 'delete', {}, id);
          if (result.success) {
            alert('Request submitted for approval. An owner will review your changes.');
          } else {
            alert(`Failed to submit for approval: ${result.error}`);
          }
        } else {
          await deleteSponsor(id);
        }
      } catch (error) {
        console.error('Error deleting sponsor:', error);
        alert('Failed to delete sponsor. Please try again.');
      }
    }
  };

  const handleToggleFeatured = async (id: number) => {
    try {
      if (requiresApproval) {
        // Find the sponsor to get current state
        const sponsor = sponsors.find(s => s.id === id);
        if (!sponsor) return;
        
        const result = await submitForApproval('sponsor', 'update', { featured: !sponsor.featured }, id);
        if (result.success) {
          alert('Request submitted for approval. An owner will review your changes.');
        } else {
          alert(`Failed to submit for approval: ${result.error}`);
        }
      } else {
        await toggleSponsorFeatured(id);
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Failed to update featured status. Please try again.');
    }
  };

  const startEditing = (sponsor: Sponsor) => {
    setForm({
      name: sponsor.name,
      category: sponsor.category,
      logo: sponsor.logo,
      description: sponsor.description || '',
      website: sponsor.website || '',
      featured: sponsor.featured || false,
      order_position: sponsor.order_position || 1
    });
    setEditing(sponsor.id);
  };

  const handleAddPackage = async () => {
    if (!packageForm.tier || !packageForm.price) {
      alert('Please fill in all required fields (tier and price)');
      return;
    }
    
    try {
      // Sanitize: trim and drop empty benefits
      const sanitized = {
        ...packageForm,
        benefits: (packageForm.benefits || []).map((b) => (b || '').trim()).filter(Boolean),
      };
      
      if (requiresApproval) {
        const result = await submitForApproval('sponsorship_package', 'create', sanitized);
        if (result.success) {
          alert('Request submitted for approval. An owner will review your changes.');
          setIsAddingPackage(false);
          resetPackageForm();
          try { localStorage.removeItem('admin_sponsor_package_form_draft'); } catch {}
        } else {
          alert(`Failed to submit for approval: ${result.error}`);
        }
      } else {
        await addSponsorshipPackage(sanitized);
        setIsAddingPackage(false);
        resetPackageForm();
        try { localStorage.removeItem('admin_sponsor_package_form_draft'); } catch {}
      }
    } catch (error) {
      console.error('Error adding sponsorship package:', error);
      alert('Failed to add sponsorship package. Please try again.');
    }
  };

  const handleUpdatePackage = async (id: number) => {
    if (!packageForm.tier || !packageForm.price) {
      alert('Please fill in all required fields (tier and price)');
      return;
    }
    
    try {
      // Sanitize: trim and drop empty benefits
      const sanitized = {
        ...packageForm,
        benefits: (packageForm.benefits || []).map((b) => (b || '').trim()).filter(Boolean),
      };
      
      if (requiresApproval) {
        const result = await submitForApproval('sponsorship_package', 'update', sanitized, id);
        if (result.success) {
          alert('Request submitted for approval. An owner will review your changes.');
          setEditingPackage(null);
          resetPackageForm();
          try { localStorage.removeItem('admin_sponsor_package_form_draft'); } catch {}
        } else {
          alert(`Failed to submit for approval: ${result.error}`);
        }
      } else {
        const steps = savingProgress.withSteps(3, 'Preparing…');
        steps.next('Validating');
        await updateSponsorshipPackage(id, sanitized);
        steps.next('Finalizing');
        setEditingPackage(null);
        resetPackageForm();
        try { localStorage.removeItem('admin_sponsor_package_form_draft'); } catch {}
        savingProgress.done();
      }
    } catch (error) {
      console.error('Error updating sponsorship package:', error);
      alert('Failed to update sponsorship package. Please try again.');
      savingProgress.done();
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (confirm('Are you sure you want to delete this sponsorship package? This action cannot be undone.')) {
      try {
        if (requiresApproval) {
          const result = await submitForApproval('sponsorship_package', 'delete', {}, id);
          if (result.success) {
            alert('Request submitted for approval. An owner will review your changes.');
          } else {
            alert(`Failed to submit for approval: ${result.error}`);
          }
        } else {
          await deleteSponsorshipPackage(id);
        }
      } catch (error) {
        console.error('Error deleting sponsorship package:', error);
        alert('Failed to delete sponsorship package. Please try again.');
      }
    }
  };

  const handleTogglePackageEnabled = async (id: number) => {
    try {
      if (requiresApproval) {
        const pkg = sponsorshipPackages.find(p => p.id === id);
        if (!pkg) return;
        
        const result = await submitForApproval('sponsorship_package', 'update', { enabled: !pkg.enabled }, id);
        if (result.success) {
          alert('Request submitted for approval. An owner will review your changes.');
        } else {
          alert(`Failed to submit for approval: ${result.error}`);
        }
      } else {
        await toggleSponsorshipPackageEnabled(id);
      }
    } catch (error) {
      console.error('Error toggling package status:', error);
      alert('Failed to update package status. Please try again.');
    }
  };

  const startEditingPackage = (pkg: SponsorshipPackage) => {
    setPackageForm({
      tier: pkg.tier,
      price: pkg.price,
      color: pkg.color,
      icon: pkg.icon,
      benefits: (pkg.benefits as any) && Array.isArray(pkg.benefits) ? pkg.benefits : [],
      order_position: pkg.order_position,
      enabled: pkg.enabled
    });
    setEditingPackage(pkg.id);
    setPackageIconTouched(false);
  };

  const handleSaveSettings = async () => {
    try {
      if (requiresApproval) {
        // For settings, we treat it as an update to a singleton 'sponsorship_settings' entity
        // We might need to handle ID if it exists, or just pass '1' or similar if it's a singleton table row
        // Assuming sponsorshipSettings has an ID, or we use a fixed ID for singleton
        const settingsId = (sponsorshipSettings as any)?.id || 1; 
        
        const result = await submitForApproval('sponsorship_settings', 'update', settingsForm, settingsId);
        if (result.success) {
          alert('Request submitted for approval. An owner will review your changes.');
          setIsEditingSettings(false);
          try { localStorage.removeItem('admin_sponsorship_settings_draft'); } catch {}
        } else {
          alert(`Failed to submit for approval: ${result.error}`);
        }
      } else {
        const steps = savingProgress.withSteps(3, 'Preparing…');
        steps.next('Validating');
        await updateSponsorshipSettings(settingsForm);
        steps.next('Finalizing');
        setIsEditingSettings(false);
        alert('Sponsorship settings updated successfully!');
        try { localStorage.removeItem('admin_sponsorship_settings_draft'); } catch {}
        savingProgress.done();
      }
    } catch (error) {
      console.error('Error updating sponsorship settings:', error);
      alert('Failed to update sponsorship settings. Please try again.');
      savingProgress.done();
    }
  };

  const handleCancelSettings = () => {
    setSettingsForm({
      page_title: (sponsorshipSettings as any)?.page_title || 'OUR SPONSORS',
      intro_text: sponsorshipSettings?.intro_text || `${BRAND_NAME} ${BRAND_YEAR} is made possible by the generous support of our sponsors.`,
      call_to_action_text: sponsorshipSettings?.call_to_action_text || 'Interested in Sponsoring?',
      brochure_url: sponsorshipSettings?.brochure_url || '',
      brochure_title: sponsorshipSettings?.brochure_title || 'Download Sponsorship Brochure'
    });
    setIsEditingSettings(false);
  };

  const handleAddContact = async () => {
    if (!contactForm.title || !contactForm.content) {
      alert('Please fill in all required fields (title and content)');
      return;
    }
    
    try {
      if (requiresApproval) {
        const result = await submitForApproval('contact_section', 'create', contactForm);
        if (result.success) {
          alert('Request submitted for approval. An owner will review your changes.');
          setIsAddingContact(false);
          resetContactForm();
          try { localStorage.removeItem('admin_sponsor_contact_form_draft'); } catch {}
        } else {
          alert(`Failed to submit for approval: ${result.error}`);
        }
      } else {
        await addContactSection(contactForm);
        setIsAddingContact(false);
        resetContactForm();
        try { localStorage.removeItem('admin_sponsor_contact_form_draft'); } catch {}
      }
    } catch (error) {
      console.error('Error adding contact section:', error);
      alert('Failed to add contact section. Please try again.');
    }
  };

  const handleUpdateContact = async (id: number) => {
    if (!contactForm.title || !contactForm.content) {
      alert('Please fill in all required fields (title and content)');
      return;
    }
    
    try {
      if (requiresApproval) {
        const result = await submitForApproval('contact_section', 'update', contactForm, id);
        if (result.success) {
          alert('Request submitted for approval. An owner will review your changes.');
          setEditingContact(null);
          resetContactForm();
          try { localStorage.removeItem('admin_sponsor_contact_form_draft'); } catch {}
        } else {
          alert(`Failed to submit for approval: ${result.error}`);
        }
      } else {
        const steps = savingProgress.withSteps(3, 'Preparing…');
        steps.next('Validating');
        await updateContactSection(id, contactForm);
        steps.next('Finalizing');
        setEditingContact(null);
        resetContactForm();
        try { localStorage.removeItem('admin_sponsor_contact_form_draft'); } catch {}
        savingProgress.done();
      }
    } catch (error) {
      console.error('Error updating contact section:', error);
      alert('Failed to update contact section. Please try again.');
      savingProgress.done();
    }
  };

  const handleDeleteContact = async (id: number) => {
    if (confirm('Are you sure you want to delete this contact section?')) {
      try {
        if (requiresApproval) {
          const result = await submitForApproval('contact_section', 'delete', {}, id);
          if (result.success) {
            alert('Request submitted for approval. An owner will review your changes.');
          } else {
            alert(`Failed to submit for approval: ${result.error}`);
          }
        } else {
          await deleteContactSection(id);
        }
      } catch (error) {
        console.error('Error deleting contact section:', error);
        alert('Failed to delete contact section. Please try again.');
      }
    }
  };

  const startEditingContact = (contact: ContactSection) => {
    setContactForm({
      type: contact.type,
      title: contact.title,
      content: contact.content,
      icon: contact.icon,
      enabled: contact.enabled,
      order: contact.order
    });
    setEditingContact(contact.id);
  };

  const addBenefit = () => {
    setPackageForm(prev => ({
      ...prev,
      benefits: [...prev.benefits, '']
    }));
  };

  const updateBenefit = (index: number, value: string) => {
    setPackageForm(prev => ({
      ...prev,
      benefits: prev.benefits.map((b, i) => i === index ? value : b)
    }));
  };

  const removeBenefit = (index: number) => {
    setPackageForm(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const handleBrochureDownload = () => {
    if (sponsorshipSettings?.brochure_url) {
      window.open(sponsorshipSettings.brochure_url, '_blank');
    }
  };

  const getCategoryColor = (category: string) => {
    // Find matching sponsorship package
    const matchingPackage = sponsorshipPackages.find(pkg => 
      pkg.tier.toLowerCase() === category.toLowerCase()
    );
    
    if (matchingPackage) {
      // Extract color from gradient class (e.g., "from-blue-500 to-blue-600" -> "#3B82F6")
      const colorMap: Record<string, string> = {
        'blue': '#3B82F6',
        'purple': '#8B5CF6',
        'pink': '#EC4899',
        'green': '#10B981',
        'yellow': '#F59E0B',
        'red': '#EF4444',
        'gray': '#6B7280',
        'indigo': '#6366F1',
        'cyan': '#06B6D4',
        'orange': '#F97316'
      };
      
      const colorKey = Object.keys(colorMap).find(key => 
        matchingPackage.color.toLowerCase().includes(key)
      );
      
      if (colorKey) {
        return colorMap[colorKey];
      }
    }
    
    // Default colors for fixed categories
    switch (category) {
      case 'Title Sponsor':
        return '#FFD700'; // Gold
      case 'Co Sponsor':
        return '#C0C0C0'; // Silver
      default:
        return '#6B7280'; // Gray
    }
  };

  // Group sponsors by category for better organization
  const groupedSponsors = allCategories.reduce((acc, category) => {
    acc[category] = sponsors.filter(sponsor => sponsor.category === category);
    return acc;
  }, {} as Record<string, Sponsor[]>);

  // Sort packages by order position
  const sortedPackages = [...sponsorshipPackages].sort((a, b) => a.order_position - b.order_position);

  // Sort contact sections by order
  const sortedContactSections = [...(sponsorshipSettings?.contactSections || [])].sort((a, b) => a.order - b.order);

  const predefinedColors = [
    'from-gray-500 to-gray-600',
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
    'from-green-500 to-green-600',
    'from-yellow-500 to-yellow-600',
    'from-red-500 to-red-600',
    'from-indigo-500 to-indigo-600',
    'from-cyan-500 to-cyan-600',
    'from-orange-500 to-orange-600'
  ];

  // Expanded icon options to cover more package/partner names
  const iconOptions = [
    'Award',
    'Crown',
    'Star',
    'Gem',
    'Shield',
    'ShieldCheck',
    'Trophy',
    'Medal',
    'Target',
    'Zap',
    'Sparkles',
    'Megaphone', // Media Partner
    'GraduationCap', // Knowledge/Education Partner
    'Users', // Community Partner
    'Handshake', // Partner/Associate
    'Utensils', // Hospitality/Food Partner
    'BadgeCheck', // Associate/Verified
    'Rocket' // Premium/Launch/Platinum vibes
  ];

  // Choose a sensible default icon based on common tier naming patterns
  const defaultIconForTier = (tier: string): string => {
    const t = (tier || '').toLowerCase();
    if (/title/.test(t)) return 'Crown';
    if (/co\s*-?\s*sponsor/.test(t)) return 'Award';
    if (/diamond|platinum/.test(t)) return 'Gem';
    if (/gold/.test(t)) return 'Trophy';
    if (/silver|bronze/.test(t)) return 'Medal';
    if (/media\s*partner/.test(t)) return 'Megaphone';
    if (/(knowledge|education)/.test(t)) return 'GraduationCap';
    if (/community/.test(t)) return 'Users';
    if (/hospitality|food|catering/.test(t)) return 'Utensils';
    if (/associate|partner/.test(t)) return 'Handshake';
    if (/patron|protector|guardian|safety|security/.test(t)) return 'ShieldCheck';
    return 'Award';
  };

  const contactTypes = [
    { value: 'email', label: 'Email', icon: 'Mail' },
    { value: 'phone', label: 'Phone', icon: 'Phone' },
    { value: 'address', label: 'Address', icon: 'MapPin' },
    { value: 'custom', label: 'Custom', icon: 'MessageSquare' }
  ];

  const handleMovePackage = async (id: number, direction: 'up' | 'down') => {
    const currentIndex = sortedPackages.findIndex(p => p.id === id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedPackages.length) return;
    
    const currentPkg = sortedPackages[currentIndex];
    const targetPkg = sortedPackages[targetIndex];
    
    // Swap order positions
    const currentOrder = currentPkg.order_position;
    const targetOrder = targetPkg.order_position;
    
    try {
      // If positions are the same, we need to force a difference
      if (currentOrder === targetOrder) {
        await updateSponsorshipPackage(currentPkg.id, { order_position: direction === 'up' ? currentOrder - 1 : currentOrder + 1 });
      } else {
        // Standard swap
        await updateSponsorshipPackage(currentPkg.id, { order_position: targetOrder });
        await updateSponsorshipPackage(targetPkg.id, { order_position: currentOrder });
      }
    } catch (error) {
      console.error('Failed to reorder packages:', error);
      alert('Failed to reorder packages');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sponsors Management</h2>
          <p className="text-gray-600">Manage sponsors, packages, and sponsorship settings</p>
        </div>
        <div className="ml-6 w-full max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">Page Title</label>
          <input
            type="text"
            value={settingsForm.page_title}
            onChange={(e) => setSettingsForm(prev => ({ ...prev, page_title: e.target.value }))}
            placeholder="OUR SPONSORS"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
          />
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveSubTab('sponsors')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSubTab === 'sponsors'
                ? 'bg-yellow-400 text-black'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Sponsors
          </button>
          <button
            onClick={() => setActiveSubTab('packages')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSubTab === 'packages'
                ? 'bg-yellow-400 text-black'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Packages
          </button>
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSubTab === 'settings'
                ? 'bg-yellow-400 text-black'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Sponsors Tab */}
      {activeSubTab === 'sponsors' && (
        <div className="space-y-6">
          {/* Add Sponsor Button */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Sponsors ({sponsors.length})</h3>
              <p className="text-gray-600">Manage festival sponsors and partnerships</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAdding(true);
                resetForm();
              }}
              className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors flex items-center"
            >
              <Plus size={16} className="mr-2" />
              Add Sponsor
            </button>
          </div>

          {/* Package Categories Info */}
          {sponsorshipPackages.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Available Sponsorship Categories</h3>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border"
                    style={{ 
                      backgroundColor: `${getCategoryColor(category)}20`,
                      borderColor: `${getCategoryColor(category)}40`,
                      color: getCategoryColor(category)
                    }}
                  >
                    <span 
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: getCategoryColor(category) }}
                    ></span>
                    {category}
                  </span>
                ))}
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Categories are automatically updated based on your sponsorship packages. 
                Manage packages in the "Packages" tab to add or remove categories.
              </p>
            </div>
          )}

          {/* Add Sponsor Form */}
          {isAdding && (
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
              <h3 className="text-lg font-semibold mb-6">Add New Sponsor</h3>
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sponsor Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Company or organization name"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    >
                      <option value="">Select sponsorship category</option>
                      {allCategories.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    {allCategories.length === 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        No sponsorship categories available. Please add sponsorship packages first.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description about the sponsor"
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website (Optional)</label>
                    <input
                      type="url"
                      value={form.website}
                      onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://sponsor-website.com"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                      <input
                        type="number"
                        value={form.order_position}
                        onChange={(e) => setForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                        min="1"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={form.featured}
                          onChange={(e) => setForm(prev => ({ ...prev, featured: e.target.checked }))}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Featured</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sponsor Logo *</label>
                    <ImageUpload
                      onImageSelect={(url) => setForm(prev => ({ ...prev, logo: url }))}
                      currentImage={form.logo}
                      bucket="sponsor-logos"
                      folder="sponsors"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    resetForm();
                  }}
                  className="w-full sm:w-auto px-6 py-2 text-gray-600 hover:text-gray-800 flex items-center justify-center"
                >
                  <X size={16} className="mr-1" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={availableCategories.length === 0}
                  className="w-full sm:w-auto px-6 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} className="mr-1" />
                  Add Sponsor
                </button>
              </div>
            </div>
          )}

          {/* Sponsors by Category */}
          {allCategories.map((category) => {
            const categorySponsors = groupedSponsors[category] || [];
            if (categorySponsors.length === 0 && !isAdding && editing === null) return null;

            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-semibold text-gray-900">{category}</h3>
                  <span 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getCategoryColor(category) }}
                  ></span>
                  <span className="text-sm text-gray-500">({categorySponsors.length} sponsors)</span>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categorySponsors.map((sponsor) => (
                    <div key={sponsor.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                      {editing === sponsor.id ? (
                        <div className="p-6 space-y-4">
                          <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Sponsor name"
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                          />
                          <select
                            value={form.category}
                            onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                          >
                            <option value="">Select category</option>
                            {/* Allow selecting both package-derived and existing sponsor-only categories to avoid losing current values */}
                            {allCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <textarea
                            value={form.description}
                            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            placeholder="Description"
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                          />
                          <input
                            type="url"
                            value={form.website}
                            onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))}
                            placeholder="Website URL"
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <input
                              type="number"
                              value={form.order_position}
                              onChange={(e) => setForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                              min="1"
                              placeholder="Display order"
                              className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                            />
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={form.featured}
                                onChange={(e) => setForm(prev => ({ ...prev, featured: e.target.checked }))}
                                className="mr-2"
                              />
                              <span className="text-sm">Featured</span>
                            </label>
                          </div>
                          <ImageUpload
                            onImageSelect={(url) => setForm(prev => ({ ...prev, logo: url }))}
                            currentImage={form.logo}
                            bucket="sponsor-logos"
                            folder="sponsors"
                            className="h-32"
                          />
                          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-gray-200 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(null);
                                resetForm();
                              }}
                              className="w-full sm:w-auto px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center justify-center"
                            >
                              <X size={14} className="mr-1" />
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdate(sponsor.id)}
                              className="w-full sm:w-auto px-4 py-2 bg-yellow-400 text-black rounded hover:bg-yellow-300 flex items-center justify-center"
                            >
                              <Save size={14} className="mr-1" />
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="relative h-32 bg-black rounded-md overflow-hidden">
                            <div className="relative h-full flex items-center justify-center p-4 logo-no-bg">
                              <img
                                src={sponsor.logo}
                                alt={sponsor.name}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            <div className="absolute top-2 left-2 flex space-x-1">
                              {sponsor.featured && (
                                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                              )}
                            </div>
                            <div className="absolute top-2 right-2">
                              <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                                #{sponsor.order_position || 1}
                              </span>
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-bold text-lg text-gray-900">{sponsor.name}</h3>
                              <span 
                                className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: getCategoryColor(sponsor.category) }}
                              >
                                {sponsor.category}
                              </span>
                            </div>
                            {sponsor.description && sponsor.description.trim().length > 0 && (
                              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{sponsor.description}</p>
                            )}
                            
                            {sponsor.website && (
                              <div className="mb-4">
                                <a
                                  href={sponsor.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                >
                                  <ExternalLink size={14} className="mr-1" />
                                  Visit Website
                                </a>
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center">
                              <button
                                type="button"
                                onClick={() => handleToggleFeatured(sponsor.id)}
                                className={`p-1 rounded transition-colors ${
                                  sponsor.featured 
                                    ? 'bg-yellow-100 text-yellow-600' 
                                    : 'bg-gray-100 text-gray-600'
                                } hover:bg-yellow-200`}
                                title={sponsor.featured ? 'Remove from featured' : 'Mark as featured'}
                              >
                                <Star size={14} className={sponsor.featured ? 'fill-current' : ''} />
                              </button>
                              
                              <div className="flex space-x-1">
                                <button
                                  type="button"
                                  onClick={() => startEditing(sponsor)}
                                  className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500 transition-colors"
                                  title="Edit sponsor"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(sponsor.id)}
                                  className="bg-red-600 text-white p-1 rounded hover:bg-red-500 transition-colors"
                                  title="Delete sponsor"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* No Sponsors Message */}
          {sponsors.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <Building size={64} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Sponsors Yet</h3>
              <p className="text-gray-500 mb-4">Start by adding your first sponsor</p>
              {availableCategories.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(true);
                    resetForm();
                  }}
                  className="bg-yellow-400 text-black px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
                >
                  Add First Sponsor
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-red-600 mb-2">No sponsorship categories available</p>
                  <p className="text-sm text-gray-500">Please add sponsorship packages first to create categories</p>
                  <button
                    onClick={() => setActiveSubTab('packages')}
                    className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors"
                  >
                    Manage Packages
                  </button>
                </div>
              )}
            </div>
          )}

          {/* No Categories Warning */}
          {availableCategories.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center">
                <Building className="w-6 h-6 text-yellow-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-yellow-800">No Sponsorship Categories Available</h3>
                  <p className="text-yellow-700 mt-1">
                    You need to create sponsorship packages first. The sponsor categories are automatically 
                    generated from your sponsorship package tiers.
                  </p>
                  <button
                    onClick={() => setActiveSubTab('packages')}
                    className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-500 transition-colors"
                  >
                    Create Sponsorship Packages
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="grid md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-yellow-500 mb-1">{sponsors.length}</div>
                <div className="text-gray-600 text-sm">Total Sponsors</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500 mb-1">
                  {sponsors.filter(s => s.featured).length}
                </div>
                <div className="text-gray-600 text-sm">Featured Sponsors</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500 mb-1">{availableCategories.length}</div>
                <div className="text-gray-600 text-sm">Available Categories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500 mb-1">{sponsorshipPackages.length}</div>
                <div className="text-gray-600 text-sm">Sponsorship Packages</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Packages Tab */}
      {activeSubTab === 'packages' && (
        <div className="space-y-6">
          {/* Add Package Button */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Sponsorship Packages ({sponsorshipPackages.length})</h3>
              <p className="text-gray-600">Manage sponsorship tiers and pricing</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddingPackage(true);
                resetPackageForm();
              }}
              className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors flex items-center"
            >
              <Plus size={16} className="mr-2" />
              Add Package
            </button>
          </div>

          {/* Add Package Form */}
          {isAddingPackage && (
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
              <h3 className="text-lg font-semibold mb-6">Add New Sponsorship Package</h3>
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tier Name *</label>
                    <input
                      type="text"
                      value={packageForm.tier}
                      onChange={(e) => {
                        const nextTier = e.target.value;
                        setPackageForm(prev => {
                          // Auto-suggest icon if user hasn't manually chosen one yet
                          if (!packageIconTouched) {
                            const suggested = defaultIconForTier(nextTier);
                            return { ...prev, tier: nextTier, icon: suggested };
                          }
                          return { ...prev, tier: nextTier };
                        });
                      }}
                      placeholder="e.g., Platinum Sponsor, Gold Sponsor"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
                    <input
                      type="text"
                      value={packageForm.price}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="e.g., ₹50,000, Contact Us"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color Theme</label>
                    <div className="grid grid-cols-2 gap-2">
                      {predefinedColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setPackageForm(prev => ({ ...prev, color }))}
                          className={`p-3 rounded-lg border-2 transition-all text-white text-sm font-medium ${
                            packageForm.color === color ? 'border-gray-900 scale-105' : 'border-gray-300 hover:scale-102'
                          } bg-gradient-to-r ${color}`}
                        >
                          {color.split('-')[1].charAt(0).toUpperCase() + color.split('-')[1].slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                    <div className="grid grid-cols-5 gap-2">
                      {iconOptions.map((iconName) => {
                        const IconComponent = getIconComponent(iconName);
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => {
                              setPackageIconTouched(true);
                              setPackageForm(prev => ({ ...prev, icon: iconName }));
                            }}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              packageForm.icon === iconName 
                                ? 'border-yellow-400 bg-yellow-50' 
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            <IconComponent size={20} className="mx-auto text-gray-900" />
                          </button>
                        );
                      })}
                    </div>
                    {!packageIconTouched && packageForm.tier && (
                      <p className="text-xs text-gray-500 mt-2">Suggested icon based on tier: {defaultIconForTier(packageForm.tier)}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                      <input
                        type="number"
                        value={packageForm.order_position}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                        min="1"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={packageForm.enabled}
                          onChange={(e) => setPackageForm(prev => ({ ...prev, enabled: e.target.checked }))}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Enabled</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Benefits</label>
                    <div className="space-y-2">
                      {packageForm.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={benefit}
                            onChange={(e) => updateBenefit(index, e.target.value)}
                            placeholder="Package benefit"
                            className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                          />
                          <button
                            type="button"
                            onClick={() => removeBenefit(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addBenefit}
                        className="text-yellow-600 hover:text-yellow-700 text-sm flex items-center"
                      >
                        <Plus size={16} className="mr-1" />
                        Add Benefit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingPackage(false);
                    resetPackageForm();
                  }}
                  className="w-full sm:w-auto px-6 py-2 text-gray-600 hover:text-gray-800 flex items-center justify-center"
                >
                  <X size={16} className="mr-1" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddPackage}
                  className="w-full sm:w-auto px-6 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 flex items-center justify-center"
                >
                  <Save size={16} className="mr-1" />
                  Add Package
                </button>
              </div>
            </div>
          )}

          {/* Packages List */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedPackages.map((pkg, index) => {
              const IconComponent = getIconComponent(pkg.icon);
              return (
                <div key={pkg.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  {editingPackage === pkg.id ? (
                    <div className="p-6 space-y-4">
                      <input
                        type="text"
                        value={packageForm.tier}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, tier: e.target.value }))}
                        placeholder="Tier name"
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                      />
                      <input
                        type="text"
                        value={packageForm.price}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="Price"
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                      />
                      <select
                        value={packageForm.color}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                      >
                        {predefinedColors.map(color => (
                          <option key={color} value={color}>
                            {color.split('-')[1].charAt(0).toUpperCase() + color.split('-')[1].slice(1)}
                          </option>
                        ))}
                      </select>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                        <div className="grid grid-cols-5 gap-2">
                          {iconOptions.map((iconName) => {
                            const IconComponent = getIconComponent(iconName);
                            return (
                              <button
                                key={iconName}
                                type="button"
                                onClick={() => {
                                  setPackageIconTouched(true);
                                  setPackageForm(prev => ({ ...prev, icon: iconName }));
                                }}
                                className={`p-3 rounded-lg border-2 transition-all ${
                                  packageForm.icon === iconName 
                                    ? 'border-yellow-400 bg-yellow-50' 
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                <IconComponent size={20} className="mx-auto text-gray-900" />
                              </button>
                            );
                          })}
                        </div>
                        {!packageIconTouched && packageForm.tier && (
                          <p className="text-xs text-gray-500 mt-2">Suggested icon based on tier: {defaultIconForTier(packageForm.tier)}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Benefits</label>
                        <div className="space-y-2">
                          {packageForm.benefits.map((benefit, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={benefit}
                                onChange={(e) => updateBenefit(index, e.target.value)}
                                placeholder="Package benefit"
                                className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                              />
                              <button
                                type="button"
                                onClick={() => removeBenefit(index)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Remove benefit"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addBenefit}
                            className="text-yellow-600 hover:text-yellow-700 text-sm flex items-center"
                          >
                            <Plus size={16} className="mr-1" />
                            Add Benefit
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="number"
                          value={packageForm.order_position}
                          onChange={(e) => setPackageForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                          min="1"
                          placeholder="Order"
                          className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                        />
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={packageForm.enabled}
                            onChange={(e) => setPackageForm(prev => ({ ...prev, enabled: e.target.checked }))}
                            className="mr-2"
                          />
                          <span className="text-sm">Enabled</span>
                        </label>
                      </div>
                      <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-gray-200 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPackage(null);
                            resetPackageForm();
                          }}
                          className="w-full sm:w-auto px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center justify-center"
                        >
                          <X size={14} className="mr-1" />
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdatePackage(pkg.id)}
                          className="w-full sm:w-auto px-4 py-2 bg-yellow-400 text-black rounded hover:bg-yellow-300 flex items-center justify-center"
                        >
                          <Save size={14} className="mr-1" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`bg-gradient-to-r ${pkg.color} p-6 text-center rounded-t-lg`}>
                        <IconComponent className="w-12 h-12 mx-auto mb-4 text-white" />
                        <h3 className="text-xl font-bold text-white mb-2">{pkg.tier}</h3>
                        <div className="text-2xl font-black text-white">{pkg.price}</div>
                        {!pkg.enabled && (
                          <span className="inline-block bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium mt-2">
                            Disabled
                          </span>
                        )}
                      </div>
                      <div className="p-6">
                        <div className="mb-4">
                          <span className="text-xs text-gray-500">Order: {pkg.order_position}</span>
                        </div>
                        <ul className="space-y-2 mb-4">
                          {pkg.benefits.slice(0, 3).map((benefit, index) => (
                            <li key={index} className="flex items-start text-sm">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                              <span className="text-gray-700">{benefit}</span>
                            </li>
                          ))}
                          {pkg.benefits.length > 3 && (
                            <li className="text-sm text-gray-500">
                              +{pkg.benefits.length - 3} more benefits
                            </li>
                          )}
                        </ul>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex space-x-1 mr-2">
                            <button
                              type="button"
                              onClick={() => handleMovePackage(pkg.id, 'up')}
                              disabled={index === 0}
                              className={`p-1 rounded transition-colors ${
                                index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
                              }`}
                              title="Move Up"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMovePackage(pkg.id, 'down')}
                              disabled={index === sortedPackages.length - 1}
                              className={`p-1 rounded transition-colors ${
                                index === sortedPackages.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
                              }`}
                              title="Move Down"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTogglePackageEnabled(pkg.id)}
                            className={`p-1 rounded transition-colors ${
                              pkg.enabled 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-red-100 text-red-600'
                            } hover:bg-green-200`}
                            title={pkg.enabled ? 'Disable package' : 'Enable package'}
                          >
                            {pkg.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          
                          <div className="flex space-x-1">
                            <button
                              type="button"
                              onClick={() => startEditingPackage(pkg)}
                              className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500 transition-colors"
                              title="Edit package"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePackage(pkg.id)}
                              className="bg-red-600 text-white p-1 rounded hover:bg-red-500 transition-colors"
                              title="Delete package"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* No Packages Message */}
          {sponsorshipPackages.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <Award size={64} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Sponsorship Packages Yet</h3>
              <p className="text-gray-500 mb-4">Start by creating your first sponsorship package</p>
              <button
                type="button"
                onClick={() => {
                  setIsAddingPackage(true);
                  resetPackageForm();
                }}
                className="bg-yellow-400 text-black px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
              >
                Create First Package
              </button>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          {/* Settings Header */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Sponsorship Settings</h3>
              <p className="text-gray-600">Manage sponsorship page content and contact information</p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingSettings(!isEditingSettings)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 flex items-center transition-colors"
            >
              {isEditingSettings ? (
                <>
                  <X size={16} className="mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit size={16} className="mr-2" />
                  Edit Settings
                </>
              )}
            </button>
          </div>

          {/* Settings Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            {isEditingSettings ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Page Title</label>
                  <input
                    type="text"
                    value={settingsForm.page_title}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, page_title: e.target.value }))}
                    placeholder="OUR SPONSORS"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Intro Text</label>
                  <textarea
                    value={settingsForm.intro_text}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, intro_text: e.target.value }))}
                    placeholder="Introduction text for the sponsors page"
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Call to Action Text</label>
                  <input
                    type="text"
                    value={settingsForm.call_to_action_text}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, call_to_action_text: e.target.value }))}
                    placeholder="e.g., Interested in Sponsoring?"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brochure Title</label>
                  <input
                    type="text"
                    value={settingsForm.brochure_title}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, brochure_title: e.target.value }))}
                    placeholder="Download button text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brochure Source</label>
                  <div className="inline-flex rounded-md shadow-sm mb-3" role="group">
                    <button
                      type="button"
                      onClick={() => setBrochureMode('upload')}
                      className={`px-3 py-1.5 text-sm font-medium border ${brochureMode === 'upload' ? 'bg-yellow-400 text-black' : 'bg-white text-gray-700 hover:bg-gray-50'} rounded-l-md border-gray-300`}
                    >
                      <FileText className="inline-block w-4 h-4 mr-1 align-text-top" /> Upload PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrochureMode('url')}
                      className={`px-3 py-1.5 text-sm font-medium border ${brochureMode === 'url' ? 'bg-yellow-400 text-black' : 'bg-white text-gray-700 hover:bg-gray-50'} rounded-r-md border-gray-300 -ml-px`}
                    >
                      <LinkIcon className="inline-block w-4 h-4 mr-1 align-text-top" /> External URL
                    </button>
                  </div>

                  {brochureMode === 'upload' ? (
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Upload a PDF brochure</label>
                      <ImageUpload
                        onImageSelect={(url) => setSettingsForm(prev => ({ ...prev, brochure_url: url }))}
                        currentImage={settingsForm.brochure_url}
                        bucket="pdf"
                        folder="brochures"
                        acceptedTypes="application/pdf"
                        fileTypeLabel="PDF up to 10MB"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Paste a brochure URL (https)</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://example.com/brochure.pdf"
                          value={settingsForm.brochure_url}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, brochure_url: e.target.value }))}
                          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                        />
                        <a
                          href={settingsForm.brochure_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-4 py-2 rounded-lg border ${settingsForm.brochure_url ? 'text-blue-600 border-blue-200 hover:bg-blue-50' : 'text-gray-400 border-gray-200 pointer-events-none'}`}
                        >
                          Preview
                        </a>
                        <button
                          type="button"
                          onClick={() => setSettingsForm(prev => ({ ...prev, brochure_url: '' }))}
                          className="px-4 py-2 rounded-lg border text-gray-700 border-gray-300 hover:bg-gray-50"
                        >
                          Clear
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Accepts any accessible URL. For reliable hosting, prefer uploading to storage.</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCancelSettings}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 flex items-center"
                  >
                    <X size={16} className="mr-2" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 flex items-center transition-colors"
                  >
                    <Save size={16} className="mr-2" />
                    Save Settings
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Page Title</h4>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-gray-700">{(sponsorshipSettings as any)?.page_title || 'OUR SPONSORS'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Intro Text</h4>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-gray-700">{sponsorshipSettings?.intro_text}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Call to Action Text</h4>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-gray-700">{sponsorshipSettings?.call_to_action_text}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Brochure Settings</h4>
                  <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Download Button Text:</span>
                      <p className="text-gray-700">{sponsorshipSettings?.brochure_title}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Brochure File:</span>
                      {sponsorshipSettings?.brochure_url ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600 text-sm">✓ Uploaded</span>
                          <button
                            onClick={handleBrochureDownload}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            <Download size={14} className="mr-1" />
                            Download
                          </button>
                        </div>
                      ) : (
                        <span className="text-red-600 text-sm">No file uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contact Sections */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Contact Information</h4>
                <p className="text-gray-600">Manage contact details displayed on the sponsors page</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingContact(true);
                  resetContactForm();
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition-colors flex items-center"
              >
                <Plus size={16} className="mr-2" />
                Add Contact
              </button>
            </div>

            {/* Add Contact Form */}
            {isAddingContact && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                <h5 className="font-semibold mb-4">Add Contact Section</h5>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={contactForm.type}
                      onChange={(e) => {
                        const selectedType = contactTypes.find(t => t.value === e.target.value);
                        setContactForm(prev => ({ 
                          ...prev, 
                          type: e.target.value as any,
                          icon: selectedType?.icon || 'Mail'
                        }));
                      }}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900"
                    >
                      {contactTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={contactForm.title}
                      onChange={(e) => setContactForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Email Us, Call Us"
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                    <input
                      type="text"
                      value={contactForm.content}
                      onChange={(e) => setContactForm(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Contact information (email, phone, address, etc.)"
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingContact(false);
                      resetContactForm();
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
                  >
                    <X size={14} className="mr-1" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddContact}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 flex items-center"
                  >
                    <Save size={14} className="mr-1" />
                    Add Contact
                  </button>
                </div>
              </div>
            )}

            {/* Contact Sections List */}
            <div className="space-y-3">
              {sortedContactSections.map((contact) => {
                const IconComponent = getIconComponent(contact.icon);
                return (
                  <div key={contact.id} className="border border-gray-200 rounded-lg p-4">
                    {editingContact === contact.id ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={contactForm.type}
                            onChange={(e) => {
                              const selectedType = contactTypes.find(t => t.value === e.target.value);
                              setContactForm(prev => ({ 
                                ...prev, 
                                type: e.target.value as any,
                                icon: selectedType?.icon || 'Mail'
                              }));
                            }}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900"
                          >
                            {contactTypes.map(type => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={contactForm.title}
                            onChange={(e) => setContactForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                          <input
                            type="text"
                            value={contactForm.content}
                            onChange={(e) => setContactForm(prev => ({ ...prev, content: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900"
                          />
                        </div>
                        <div className="md:col-span-2 flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingContact(null);
                              resetContactForm();
                            }}
                            className="px-3 py-1 text-gray-600 hover:text-gray-800 flex items-center"
                          >
                            <X size={14} className="mr-1" />
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateContact(contact.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500 flex items-center"
                          >
                            <Save size={14} className="mr-1" />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <IconComponent className="w-5 h-5 text-gray-600" />
                          <div>
                            <div className="font-medium text-gray-900">{contact.title}</div>
                            <div className="text-sm text-gray-600">{contact.content}</div>
                            <div className="text-xs text-gray-500">
                              {contact.type} • Order: {contact.order} • {contact.enabled ? 'Enabled' : 'Disabled'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => startEditingContact(contact)}
                            className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500 transition-colors"
                            title="Edit contact"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(contact.id)}
                            className="bg-red-600 text-white p-1 rounded hover:bg-red-500 transition-colors"
                            title="Delete contact"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* No Contact Sections */}
            {sortedContactSections.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Mail size={32} className="mx-auto mb-2 opacity-50" />
                <p>No contact sections added yet</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingContact(true);
                    resetContactForm();
                  }}
                  className="mt-2 text-green-600 hover:text-green-700 font-medium"
                >
                  Add the first contact section
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};