import { SponsorEditor, SponsorDialog, SponsorLogo } from './sponsors/SponsorEditor';
import { MagnifyingGlassIcon, PlusIcon, ArrowTopRightIcon, StarIcon, StarFilledIcon, Pencil1Icon, TrashIcon, ChevronDownIcon, CheckCircledIcon, FileTextIcon } from '@radix-ui/react-icons';
import '../../styles/SponsorsWorkspace.css';
import { SponsorEditionControls, LegacySponsorArchive } from './sponsors/SponsorPublicationControls';
import { resolveHomepagePartners, readHomepagePartners, sponsorPlacement, partnerPlacementPeriod, setSponsorPlacement, type HomepagePartner, type PartnerPlacementPatch } from '../../utils/homepageContent';
import '../../styles/HomepageStudio.css';
import { sponsorshipTeamContacts } from '../../utils/sponsorshipContacts';
import { sortSponsorshipPackages, packageMovePlan } from '../../utils/sponsorshipPackages';
import { safeSponsorLink } from '../../utils/sponsorPresentation';
import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Trash2, Medal, Edit, Save, FileImage, ArrowUp, ArrowDown, Eye, EyeOff, Award, FileText, Link as LinkIcon, Download, Mail } from 'lucide-react';
import { SponsorIconCatalog as LucideIcons } from '../../lib/sponsorIconCatalog';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import { AISponsorScanner } from './sponsors/AISponsorScanner';
import { AITierScanner } from './sponsors/AITierScanner';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ToastProvider';
import type { Sponsor, SponsorshipPackage, ContactSection } from '../../types/data';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';
import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';

type SubTabType = 'sponsors' | 'packages' | 'settings';

export const SponsorsManagement: React.FC = () => {
  const { push } = useToast();
  const { 
    sponsors, coreCommittees, coreTeamMembers,
    homepageSettings, updateHomepageSettings,
    sponsorshipPackages,
    sponsorshipSettings, sponsorshipError, refreshSponsorship,
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
    deleteContactSection,
    sanitizeUrl
  } = useData() as any;
  const savingProgress = useSavingProgress();
  const { submitForApproval, checkRequiresApproval } = useApprovals({ listen: false });
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [approvalLoading,setApprovalLoading]=useState(true);
  const [publicationBusy,setPublicationBusy]=useState(false);
  const publicationPending=useRef(false);
  const [publicationMessage,setPublicationMessage]=useState('');
  const [editionFilter,setEditionFilter]=useState<'all'|'previous'|'current'>('all');
  const [newEdition,setNewEdition]=useLocalStorage<'previous'|'current'>('admin_sponsor_new_edition','current');
  const [savingSponsor,setSavingSponsor]=useState(false);
  const [logoUploading,setLogoUploading]=useState(false);
  const [sponsorError,setSponsorError]=useState('');
  const [search,setSearch]=useState('');
  const [tierFilter,setTierFilter]=useState('all');
  const [deleteTarget,setDeleteTarget]=useState<Sponsor|null>(null);
  const [deleting,setDeleting]=useState(false);
  const sponsorSavePending=useRef(false);
  const featurePending=useRef(false);
  const [featureBusy,setFeatureBusy]=useState(false);
  const currentYear=Number(homepageSettings?.brand_year)||Number(BRAND_YEAR);
  const linkedContacts=sponsorshipTeamContacts(coreCommittees || [],coreTeamMembers || []);
  const [brochureUploading,setBrochureUploading]=useState(false);
  const [settingsSaving,setSettingsSaving]=useState(false);
  const settingsPending=useRef(false);
  const [packageBusy,setPackageBusy]=useState(false);
  const packagePending=useRef(false);
  const [packageMessage,setPackageMessage]=useState('');
  const placements=readHomepagePartners(homepageSettings?.sponsor_logos);
  const publication=resolveHomepagePartners(sponsors,placements,{currentYear});
  const homepagePublication=resolveHomepagePartners(sponsors,placements,{featuredOnly:true,currentYear});
  const savePublication=async(patch:{sponsor_logos?:HomepagePartner[];featured_partners_enabled?:boolean})=>{
    if(publicationPending.current)throw new Error('Another partner change is still saving.');
    if(requiresApproval||approvalLoading)throw new Error('An owner manages edition and visibility changes.');
    publicationPending.current=true;setPublicationBusy(true);setPublicationMessage('');
    try{await updateHomepageSettings(patch);setPublicationMessage('Partner selection saved. Sponsors and Home now use this selection.');}
    catch(error){setPublicationMessage('Could not save partner selection. Your existing selection is unchanged.');throw error;}
    finally{publicationPending.current=false;setPublicationBusy(false);}
  };
  const savePlacements=(records:HomepagePartner[])=>savePublication({sponsor_logos:records});
  const changePlacement=async(sponsor:Sponsor,patch:PartnerPlacementPatch)=>{
    try{await savePlacements(setSponsorPlacement(sponsor,placements,patch,currentYear));}catch{/* Feedback is shown above the sponsor list. */}
  };


  useEffect(() => {
    let active=true;checkRequiresApproval().then(value=>{if(active)setRequiresApproval(value);}).catch(()=>{if(active)setRequiresApproval(true);}).finally(()=>{if(active)setApprovalLoading(false);});return()=>{active=false;};
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
  const [showSponsorScanner, setShowSponsorScanner] = useState(false);
  const [showTierScanner, setShowTierScanner] = useState(false);

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
      .filter((pkg: SponsorshipPackage) => pkg.enabled)
      .map((pkg: SponsorshipPackage) => pkg.tier)
      .sort((a: string, b: string) => {
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
  const sponsorCategories = Array.from(new Set(sponsors.map((s: Sponsor) => s.category)));
  const missingCategories = sponsorCategories.filter((c) => !availableCategories.includes(c));
  // Merge and dedupe combined categories (package-derived first, then any sponsor-only categories)
  const allCategories = Array.from(new Set([...availableCategories, ...missingCategories]));

  const getIconComponent = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || Medal;
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
      icon: 'Medal',
      benefits: [],
      order_position: Math.max(0, ...sponsorshipPackages.map((pkg: any) => pkg.order_position || 0)) + 1,
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

  const validatedSponsor = () => {
    if (!form.name.trim() || !form.category.trim() || !form.logo.trim()) { setSponsorError('Add the sponsor name, tier and logo before saving.'); return null; }
    if (!Number.isInteger(form.order_position) || form.order_position < 1) { setSponsorError('Display order must be a whole number of 1 or more.'); return null; }
    const website = form.website.trim();
    const normalized = website && !/^[a-z][a-z\d+.-]*:/i.test(website) ? `https://${website}` : website;
    if (website && !safeSponsorLink(normalized)) { setSponsorError('Enter a valid website address, for example https://brand.com.'); return null; }
    return { ...form, name: form.name.trim(), category: form.category.trim(), logo: form.logo.trim(), description: form.description.trim(), website: normalized };
  };
  const handleAdd = async () => {
    if (approvalLoading || sponsorSavePending.current || logoUploading) return;
    const record = validatedSponsor(); if (!record) return;
    sponsorSavePending.current = true; setSavingSponsor(true); setSponsorError('');
    try {
      if (requiresApproval) {
        const result = await submitForApproval('sponsor', 'create', record);
        if (!result.success) throw new Error(result.error || 'Could not submit the sponsor.');
        push({ message: 'Sponsor submitted for approval.', type: 'success' });
        setIsAdding(false); resetForm();
      } else {
        const created = await addSponsor(record);
        setIsAdding(false); resetForm();
        if (created?.id) { try { await savePlacements(setSponsorPlacement(created, placements, { period: newEdition, enabled: true }, currentYear)); } catch { setPublicationMessage('Sponsor saved. Its edition could not be saved; select Previous or Current under Display settings to retry.'); } }
        push({ message: 'Sponsor added.', type: 'success' });
      }
      try { localStorage.removeItem('admin_sponsor_form_draft'); } catch {}
    } catch { setSponsorError('Could not save this sponsor. Your details are kept; please try again.'); }
    finally { sponsorSavePending.current = false; setSavingSponsor(false); }
  };
  const handleUpdate = async (id: number) => {
    if (approvalLoading || sponsorSavePending.current || logoUploading) return;
    const record = validatedSponsor(); if (!record) return;
    sponsorSavePending.current = true; setSavingSponsor(true); setSponsorError('');
    try {
      if (requiresApproval) {
        const result = await submitForApproval('sponsor', 'update', record, id);
        if (!result.success) throw new Error(result.error || 'Could not submit changes.');
      } else await updateSponsor(id, record);
      setEditing(null); resetForm();
      try { localStorage.removeItem('admin_sponsor_form_draft'); } catch {}
      push({ message: requiresApproval ? 'Changes submitted for approval.' : 'Sponsor updated.', type: 'success' });
    } catch { setSponsorError('Could not update this sponsor. Your edits are kept; please try again.'); }
    finally { sponsorSavePending.current = false; setSavingSponsor(false); }
  };
  const handleDelete = async (id: number) => {
    if (approvalLoading || sponsorSavePending.current) return;
    sponsorSavePending.current = true; setDeleting(true); setSponsorError('');
    try {
      if (requiresApproval) {
        const result = await submitForApproval('sponsor', 'delete', {}, id);
        if (!result.success) throw new Error(result.error || 'Could not submit deletion.');
      } else await deleteSponsor(id);
      setDeleteTarget(null);
      push({ message: requiresApproval ? 'Deletion submitted for approval.' : 'Sponsor deleted.', type: 'success' });
    } catch { setSponsorError('Could not delete this sponsor. Please try again.'); }
    finally { sponsorSavePending.current = false; setDeleting(false); }
  };

  const handleToggleFeatured = async (id: number) => {
    if(approvalLoading||featurePending.current)return;
    featurePending.current=true;setFeatureBusy(true);
    try {
      if (requiresApproval) {
        // Find the sponsor to get current state
        const sponsor = sponsors.find((s: Sponsor) => s.id === id);
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
      setPublicationMessage('Could not save homepage selection. Please try again.');
    } finally {featurePending.current=false;setFeatureBusy(false);}
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
    if(approvalLoading||packagePending.current)return;
    if (!packageForm.tier || !packageForm.price) {
      alert('Please fill in all required fields (tier and price)');
      return;
    }
    
    packagePending.current=true;setPackageBusy(true);
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
    } finally { packagePending.current=false;setPackageBusy(false); }
  };

  const handleUpdatePackage = async (id: number) => {
    if(approvalLoading||packagePending.current)return;
    if (!packageForm.tier || !packageForm.price) {
      alert('Please fill in all required fields (tier and price)');
      return;
    }
    
    packagePending.current=true;setPackageBusy(true);
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
    } finally { packagePending.current=false;setPackageBusy(false); }
  };

  const handleDeletePackage = async (id: number) => {
    if(approvalLoading||packagePending.current)return;
    if (confirm('Are you sure you want to delete this sponsorship package? This action cannot be undone.')) {
      packagePending.current=true;setPackageBusy(true);
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
      } finally { packagePending.current=false;setPackageBusy(false); }
    }
  };

  const handleTogglePackageEnabled = async (id: number) => {
    if(approvalLoading||packagePending.current)return;
    packagePending.current=true;setPackageBusy(true);
    try {
      if (requiresApproval) {
        const pkg = sponsorshipPackages.find((p: SponsorshipPackage) => p.id === id);
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
    } finally { packagePending.current=false;setPackageBusy(false); }
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
    if(approvalLoading||brochureUploading||settingsPending.current)return;
    if(settingsForm.brochure_url.trim()&&!safeSponsorLink(settingsForm.brochure_url)){push({message:'Add a valid http or https brochure URL.',type:'error'});return;}
    settingsPending.current=true;setSettingsSaving(true);
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
        push({ message: 'Sponsorship settings saved.', type: 'success' });
        try { localStorage.removeItem('admin_sponsorship_settings_draft'); } catch {}
        savingProgress.done();
      }
    } catch (error) {
      console.error('Error updating sponsorship settings:', error);
      push({ message: 'Could not save settings. Your edits are kept; please try again.', type: 'error' });
      savingProgress.done();
    } finally {settingsPending.current=false;setSettingsSaving(false);}
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

  const visibleSponsors = [...sponsors].filter((sponsor: Sponsor) => {
    const matchesEdition = editionFilter === 'all' || partnerPlacementPeriod(sponsorPlacement(sponsor, placements), currentYear) === editionFilter;
    const matchesTier = tierFilter === 'all' || sponsor.category === tierFilter;
    const term = search.trim().toLowerCase();
    return matchesEdition && matchesTier && (!term || [sponsor.name, sponsor.category, sponsor.website, sponsor.description].some(value => value?.toLowerCase().includes(term)));
  }).sort((a: Sponsor,b: Sponsor) => (a.order_position || 0) - (b.order_position || 0) || a.id - b.id);
  const currentCount = sponsors.filter((sponsor: Sponsor) => partnerPlacementPeriod(sponsorPlacement(sponsor, placements), currentYear) === 'current').length;
  const closeSponsorEditor = () => { if (!savingSponsor && !logoUploading) { setEditing(null); setIsAdding(false); setSponsorError(''); resetForm(); } };
  const openNewSponsor = () => { setSponsorError(''); setEditing(null); resetForm(); setIsAdding(true); };

  // Sort packages by order position
  const sortedPackages = sortSponsorshipPackages(sponsorshipPackages);

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
    'Medal',
    'Crown',
    'Star',
    'Gem',
    'Shield',
    'ShieldCheck',
    'Trophy',
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
    if (/co\s*-?\s*sponsor/.test(t)) return 'Medal';
    if (/diamond|platinum/.test(t)) return 'Gem';
    if (/gold/.test(t)) return 'Trophy';
    if (/silver|bronze/.test(t)) return 'Medal';
    if (/media\s*partner/.test(t)) return 'Megaphone';
    if (/(knowledge|education)/.test(t)) return 'GraduationCap';
    if (/community/.test(t)) return 'Users';
    if (/hospitality|food|catering/.test(t)) return 'Utensils';
    if (/associate|partner/.test(t)) return 'Handshake';
    if (/patron|protector|guardian|safety|security/.test(t)) return 'ShieldCheck';
    return 'Medal';
  };

  const contactTypes = [
    { value: 'email', label: 'Email', icon: 'Mail' },
    { value: 'phone', label: 'Phone', icon: 'Phone' },
    { value: 'address', label: 'Address', icon: 'MapPin' },
    { value: 'custom', label: 'Custom', icon: 'MessageSquare' }
  ];

  const handleMovePackage = async (id: number, direction: 'up' | 'down') => {
    if(approvalLoading||packagePending.current)return;
    const plan=packageMovePlan(sponsorshipPackages,id,direction);
    if(!plan.length)return;
    packagePending.current=true;setPackageBusy(true);setPackageMessage('');
    const completed: typeof plan=[];
    try {
      for(const step of plan){
        if(requiresApproval){
          const result=await submitForApproval('sponsorship_package','update',{order_position:step.next},step.id);
          if(!result.success)throw new Error(result.error||'Could not submit this order change.');
        }else{await updateSponsorshipPackage(step.id,{order_position:step.next});completed.push(step);}
      }
      setPackageMessage(requiresApproval?'Order changes submitted for approval.':'Package order saved. The public page uses this order.');
    }catch{
      let restored=true;
      for(const step of completed.reverse()){try{await updateSponsorshipPackage(step.id,{order_position:step.previous});}catch{restored=false;}}
      setPackageMessage(requiresApproval?'Some order requests could not be submitted. Review pending approvals before retrying.':restored?'Could not save the new order. The previous order has been restored.':'Could not finish restoring the order. Refresh packages before trying again.');
    }finally{packagePending.current=false;setPackageBusy(false);}
  };

  const base64ToFile = async (base64String: string, fileName: string): Promise<File> => {
    const [header, data] = base64String.includes(',') ? base64String.split(',') : ['', base64String];
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    
    const binary = atob(data);
    const array = [];
    for (let i = 0; i < binary.length; i++) {
      array.push(binary.charCodeAt(i));
    }
    const blob = new Blob([new Uint8Array(array)], { type: mime });
    return new File([blob], fileName, { type: mime });
  };

  const handleSponsorScanComplete = async (scannedSponsors: any[], images: string[]) => {
    setShowSponsorScanner(false);
    const progress = savingProgress.withSteps(scannedSponsors.length, 'Saving Sponsors...');
    
    try {
      let count = 0;
      for (const sp of scannedSponsors) {
        try {
          let logoUrl = '';
          
          // Handle AI captured logo
          const imgBase64 = typeof sp.image_index === 'number' ? images[sp.image_index] : null;

          if (imgBase64) {
            const fileName = `sponsor_${Date.now()}_${sp.name.replace(/[^a-z0-9]/gi, '_')}.jpg`;
            const file = await base64ToFile(imgBase64, fileName);
            
            const { error: uploadError } = await supabase.storage
              .from('sponsor-logos')
              .upload(`sponsors/${fileName}`, file, { cacheControl: '3600', upsert: true });

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('sponsor-logos')
                .getPublicUrl(`sponsors/${fileName}`);
              logoUrl = publicUrl;
            }
          }

          await addSponsor({
            name: sp.name || 'Unknown Sponsor',
            category: sp.tier_level || sp.category || 'Associate Sponsor',
            logo: logoUrl,
            description: sp.description || '',
            website: sp.website || '',
            order_position: sponsors.length + count + 1,
          });
          count++;
          progress.next(`Added ${sp.name}`);
        } catch (err) {
          console.error(`Failed to add sponsor ${sp.name}:`, err);
        }
      }
      push({ message: `Successfully imported ${count} sponsors from AI scan!`, type: 'success' });
    } catch (error: any) {
      console.error('[SponsorsManagement] AI import failed:', error);
      push({ message: `Import failed: ${error.message}`, type: 'error' });
    } finally {
      savingProgress.done();
    }
  };

  const handleTierScanComplete = async (scannedTiers: any[]) => {
    if(approvalLoading||packagePending.current)return;
    setShowTierScanner(false);packagePending.current=true;setPackageBusy(true);
    try {
      let count=0;
      for(const tier of scannedTiers){
        const record={tier:tier.tier||`Tier ${count+1}`,price:tier.price||'Contact Us',color:tier.color||'from-gray-500 to-gray-600',icon:tier.icon||'Medal',benefits:Array.isArray(tier.benefits)?tier.benefits:[],order_position:Math.max(0,...sponsorshipPackages.map((pkg: any)=>pkg.order_position||0))+count+1,enabled:true};
        if(requiresApproval){const result=await submitForApproval('sponsorship_package','create',record);if(!result.success)throw new Error(result.error||'Could not submit tier.');}
        else await addSponsorshipPackage(record);
        count++;
      }
      setPackageMessage(requiresApproval?`${count} tiers submitted for approval.`:`${count} sponsorship tiers added.`);
    }catch(error){setPackageMessage(error instanceof Error?error.message:'Could not import tiers.');}
    finally{packagePending.current=false;setPackageBusy(false);}
  };

  return (
    <div className="partners-workspace">
      {/* AI Sponsor Scanner Modal */}
      {showSponsorScanner && (
        <AISponsorScanner 
          onScanComplete={handleSponsorScanComplete}
          onCancel={() => setShowSponsorScanner(false)}
        />
      )}

      {/* AI Tier/Brochure Scanner Modal */}
      {showTierScanner && (
        <AITierScanner 
          onScanComplete={handleTierScanComplete}
          onCancel={() => setShowTierScanner(false)}
        />
      )}

      {(isAdding || editing !== null) && <SponsorEditor form={form} onChange={setForm} categories={allCategories} edition={newEdition} onEditionChange={setNewEdition} locked={approvalLoading} busy={savingSponsor} uploading={logoUploading} onUploading={setLogoUploading} error={sponsorError} editing={editing !== null} onClose={closeSponsorEditor} onSave={() => { void (editing !== null ? handleUpdate(editing) : handleAdd()); }} />}
      {deleteTarget && <SponsorDialog title="Delete this sponsor?" description="This removes the sponsor’s directory record and display links. Historical archive copies and uploaded logo files are kept." busy={deleting} onClose={() => { setDeleteTarget(null); setSponsorError(''); }} footer={<><button className="partner-button" disabled={deleting} onClick={() => setDeleteTarget(null)}>Keep sponsor</button><button className="partner-button partner-button-danger" disabled={deleting} onClick={() => void handleDelete(deleteTarget.id)}>{deleting ? 'Deleting…' : 'Delete sponsor'}</button></>}><div className="partner-delete-preview"><SponsorLogo src={deleteTarget.logo} name={deleteTarget.name} /><div><strong>{deleteTarget.name}</strong><p>{deleteTarget.category}</p></div></div>{sponsorError && <p role="alert" className="partner-feedback partner-feedback-error">{sponsorError}</p>}</SponsorDialog>}

      {sponsorshipError && <div role="alert" className="partner-feedback partner-feedback-error">{sponsorshipError} <button type="button" className="partner-text-button" onClick={() => void refreshSponsorship?.()}>Retry connection</button></div>}
      <header className="partner-workspace-heading"><div><span className="partner-eyebrow">PARTNERSHIPS / {currentYear} EDITION</span><h2>A place for every partner.</h2><p>Manage brands, their visibility and the offer behind each partnership.</p></div><button type="button" className="partner-button partner-button-primary" disabled={approvalLoading} onClick={openNewSponsor}><PlusIcon />Add sponsor</button></header>
      <nav className="partner-tabs" aria-label="Partnership tools">{([{id:'sponsors',label:'Sponsors',count:sponsors.length},{id:'packages',label:'Sponsorship packages',count:sponsorshipPackages.length},{id:'settings',label:'Page settings'}] as const).map(tab => <button key={tab.id} type="button" aria-label={tab.label} aria-current={activeSubTab === tab.id ? 'page' : undefined} onClick={() => setActiveSubTab(tab.id)}><span>{tab.label}</span>{'count' in tab && <small aria-hidden="true">{tab.count}</small>}</button>)}</nav>

      {activeSubTab === 'sponsors' && <div className="partner-workspace-grid">
        <section className="partner-directory" aria-label="Sponsor directory">
          <div className="partner-directory-heading"><div><h3>Your sponsor directory</h3><p>{sponsors.length} {sponsors.length === 1 ? 'brand' : 'brands'} · {currentCount} current · {sponsors.length - currentCount} previous</p></div><button type="button" className="partner-text-button" onClick={() => setShowSponsorScanner(true)}>Import with AI<ArrowTopRightIcon /></button></div>
          <div className="partner-searchbar"><label className="partner-search"><MagnifyingGlassIcon /><input aria-label="Search sponsors" placeholder="Search a name, tier or website…" value={search} onChange={event => setSearch(event.target.value)} />{search && <button type="button" aria-label="Clear sponsor search" onClick={() => setSearch('')}>×</button>}</label><select aria-label="Filter sponsorship tier" value={tierFilter} onChange={event => setTierFilter(event.target.value)}><option value="all">All tiers</option>{allCategories.map(category => <option key={category}>{category}</option>)}</select></div>
          <div className="partner-filterbar"><div aria-label="Sponsor editions">{(['all','current','previous'] as const).map(period => <button key={period} type="button" aria-pressed={editionFilter === period} onClick={() => setEditionFilter(period)}>{period === 'all' ? 'All sponsors' : period === 'current' ? 'Current partners' : 'Previous partners'}</button>)}</div><span>{visibleSponsors.length} shown</span></div>
          {publicationMessage && <p role="status" className="partner-feedback">{publicationMessage}</p>}
          <div className="partner-list">
            {visibleSponsors.map((sponsor: Sponsor) => {
              const placement = sponsorPlacement(sponsor, placements);
              const period = partnerPlacementPeriod(placement, currentYear);
              const href = safeSponsorLink(sponsor.website);
              const live = publication.partners.some(partner => partner.id === sponsor.id);
              return <article className="partner-record" key={sponsor.id}>
                <div className="partner-record-main"><SponsorLogo src={sanitizeUrl?.(sponsor.logo) || sponsor.logo} name={sponsor.name} /><div className="partner-record-info"><div><h4>{sponsor.name}</h4><span className={`partner-edition ${period === 'current' ? 'is-current' : ''}`}>{period === 'current' ? currentYear : placement?.edition_year || 'Previous'}</span></div><p>{sponsor.category}<span>·</span>Order {sponsor.order_position || 1}</p>{href && <a href={href} target="_blank" rel="noopener noreferrer">{new URL(href).hostname.replace(/^www\./,'')}<ArrowTopRightIcon /></a>}</div><div className="partner-record-actions"><button type="button" className={`partner-icon partner-home-toggle${sponsor.featured ? ' is-selected' : ''}`} disabled={featureBusy || publicationBusy || approvalLoading} aria-pressed={sponsor.featured === true} aria-label={`${sponsor.featured ? 'Hide' : 'Show'} ${sponsor.name} ${sponsor.featured ? 'from' : 'on'} homepage`} title={sponsor.featured ? 'Selected for homepage' : 'Show on homepage'} onClick={() => void handleToggleFeatured(sponsor.id)}>{sponsor.featured ? <StarFilledIcon /> : <StarIcon />}</button><button type="button" className="partner-icon" aria-label={`Edit ${sponsor.name}`} title="Edit sponsor" onClick={() => { setIsAdding(false); setSponsorError(''); startEditing(sponsor); }}><Pencil1Icon /></button><button type="button" className="partner-icon partner-delete" disabled={approvalLoading} aria-label={`Delete ${sponsor.name}`} title="Delete sponsor" onClick={() => { setSponsorError(''); setDeleteTarget(sponsor); }}><TrashIcon /></button></div></div>
                <div className="partner-record-footer"><span className={live ? 'partner-live' : 'partner-muted'}><span />{placement?.enabled === false ? 'Hidden from website' : live ? 'Live on Sponsors' : 'Saved for another edition'}{live && sponsor.featured && homepageSettings?.featured_partners_enabled !== false ? ' + Home' : ''}</span><details><summary>Display settings<ChevronDownIcon /></summary><SponsorEditionControls sponsor={sponsor} placements={placements} busy={publicationBusy} locked={requiresApproval || approvalLoading} currentYear={currentYear} onChange={patch => void changePlacement(sponsor,patch)} /></details></div>
              </article>;
            })}
            {!visibleSponsors.length && <div className="partner-empty"><span className="partner-empty-symbol"><StarIcon /></span><h4>{sponsors.length ? 'No matching sponsors' : 'Your next partnership starts here.'}</h4><p>{sponsors.length ? 'Try another name, edition or sponsorship tier.' : 'Add a brand, choose its tier and upload a logo.'}</p><button className="partner-button" type="button" onClick={sponsors.length ? () => { setSearch(''); setTierFilter('all'); setEditionFilter('all'); } : openNewSponsor}>{sponsors.length ? 'Clear filters' : 'Add your first sponsor'}</button></div>}
          </div>
          <LegacySponsorArchive sponsors={sponsors} placements={placements} busy={publicationBusy} locked={requiresApproval || approvalLoading} currentYear={currentYear} onSave={savePlacements} />
        </section>
        <aside className="partner-publishing" aria-label="Website display preview">
          <div className="partner-live-panel"><span className="partner-eyebrow"><CheckCircledIcon />ON YOUR WEBSITE</span><h3>{publication.period === 'current' ? `${currentYear} partners` : 'Previous partners'}</h3><p>{publication.period === 'current' ? 'Your current edition is live.' : 'Earlier partners stay visible until a complete current partner is published.'}</p><div className="partner-wall">{publication.partners.slice(0,6).map((partner,index) => <SponsorLogo key={`${partner.id}-${index}`} src={partner.logo} name={partner.name} />)}{!publication.partners.length && <span>No published sponsors yet</span>}</div><div className="partner-publication-count"><strong>{publication.partners.length}</strong><span>on Sponsors</span><a href="/sponsors" target="_blank" rel="noopener noreferrer" aria-label="Preview public Sponsors page"><ArrowTopRightIcon /></a></div></div>
          <div className="partner-home-panel"><div><h4>On the homepage</h4><span>{homepagePublication.partners.length} selected</span></div><label className="partner-home-switch"><span>Show partner section</span><input type="checkbox" role="switch" aria-label="Show partner section on homepage" checked={homepageSettings?.featured_partners_enabled !== false} disabled={publicationBusy || requiresApproval || approvalLoading} onChange={event => void savePublication({featured_partners_enabled:event.target.checked}).catch(() => {})} /></label><p>{homepageSettings?.featured_partners_enabled === false ? 'Homepage section is switched off' : 'Star a sponsor to include its logo when that edition is live.'}</p><small>Live edition: {publication.period}</small></div>
          <div className="partner-quick-settings"><FileTextIcon /><div><strong>Ready for your next partner?</strong><p>Keep your packages, brochure and contact details up to date.</p><button type="button" className="partner-text-button" onClick={() => setActiveSubTab('settings')}>Open page settings<ArrowTopRightIcon /></button></div></div>
        </aside>
      </div>}

      {/* Packages Tab */}
      {activeSubTab === 'packages' && (
        <div className="partner-secondary partner-packages space-y-6">
          {/* Add Package Button */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Sponsorship Packages ({sponsorshipPackages.length})</h3>
              <p className="text-gray-600">Manage sponsorship tiers and pricing</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowTierScanner(true)}
                className="bg-gradient-to-r from-pink-500 to-yellow-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all flex items-center font-bold text-sm"
              >
                <FileImage size={16} className="mr-2" />
                AI Brochure Scan
              </button>
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
          </div>

<p className="studio-auto-notice">Packages appear in this order on the public Sponsors page. Add your own tier names, prices and benefits; all enabled tiers are shown.</p>{packageMessage&&<p role="status" className="studio-auto-notice">{packageMessage}</p>}

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
                      placeholder="e.g., $50,000, Contact Us"
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
                  disabled={packageBusy||approvalLoading}
                  className="w-full sm:w-auto px-6 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 flex items-center justify-center"
                >
                  <Save size={16} className="mr-1" />
                  Add Package
                </button>
              </div>
            </div>
          )}

          {/* Packages List */}
          <div className="partner-package-list">
            {sortedPackages.map((pkg: SponsorshipPackage, index: number) => {
              const IconComponent = getIconComponent(pkg.icon);
              return (
                <div key={pkg.id} className="partner-package-record">
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
                          disabled={packageBusy||approvalLoading}
                          className="w-full sm:w-auto px-4 py-2 bg-yellow-400 text-black rounded hover:bg-yellow-300 flex items-center justify-center"
                        >
                          <Save size={14} className="mr-1" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="partner-package-row">
                      <div className="partner-package-identity"><span className="partner-package-symbol"><IconComponent /></span><div><span className="partner-eyebrow">TIER {String(index + 1).padStart(2,'0')}</span><h3>{pkg.tier}</h3><p>{pkg.price}</p></div></div>
                      <details className="partner-package-benefits"><summary>{pkg.benefits.length} benefits<ChevronDownIcon /></summary><ul>{pkg.benefits.map((benefit: string,i: number) => <li key={i}>{benefit}</li>)}</ul></details>
                      <div className="partner-package-actions"><button type="button" className={`partner-package-visibility${pkg.enabled ? ' is-enabled' : ''}`} aria-label={`${pkg.enabled ? 'Disable' : 'Enable'} ${pkg.tier}`} aria-pressed={pkg.enabled} disabled={packageBusy || approvalLoading} onClick={() => void handleTogglePackageEnabled(pkg.id)}>{pkg.enabled ? <Eye /> : <EyeOff />}{pkg.enabled ? 'Visible' : 'Hidden'}</button><div><button type="button" className="partner-icon" aria-label={`Move ${pkg.tier} up`} disabled={packageBusy || approvalLoading || index === 0} onClick={() => void handleMovePackage(pkg.id,'up')}><ArrowUp /></button><button type="button" className="partner-icon" aria-label={`Move ${pkg.tier} down`} disabled={packageBusy || approvalLoading || index === sortedPackages.length - 1} onClick={() => void handleMovePackage(pkg.id,'down')}><ArrowDown /></button><button type="button" className="partner-icon" aria-label={`Edit ${pkg.tier} package`} disabled={packageBusy || approvalLoading} onClick={() => startEditingPackage(pkg)}><Pencil1Icon /></button><button type="button" className="partner-icon partner-delete" aria-label={`Delete ${pkg.tier} package`} disabled={packageBusy || approvalLoading} onClick={() => void handleDeletePackage(pkg.id)}><TrashIcon /></button></div></div>
                    </div>
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
        <div className="partner-secondary partner-settings space-y-6">
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
              <div className="partner-settings-form">
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
                        bucket="sponsor-brochures"
                        folder={`brochures/${currentYear}`}
                        enableCropper={false}
                        preserveExistingMedia
                        onProcessingChange={setBrochureUploading}
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
                    disabled={brochureUploading||settingsSaving||approvalLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 flex items-center transition-colors"
                  >
                    <Save size={16} className="mr-2" />
                    {brochureUploading?'Uploading brochure…':settingsSaving?'Saving…':'Save Settings'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="partner-settings-overview">
                <section><span className="partner-eyebrow">PUBLIC PAGE CONTENT</span><h4>{sponsorshipSettings?.page_title || 'OUR SPONSORS'}</h4><p>{sponsorshipSettings?.intro_text || 'Add an introduction to your sponsors page.'}</p><dl><div><dt>Enquiry heading</dt><dd>{sponsorshipSettings?.call_to_action_text || 'Not set'}</dd></div><div><dt>Team contacts</dt><dd>{linkedContacts.length ? linkedContacts.map(person => person.name).join(' · ') : 'No enabled team contacts yet'}</dd></div></dl><p className="partner-settings-help">Sponsorship members and PR heads come from Rico Family. Additional office contacts are managed below.</p></section>
                <aside className="partner-brochure-preview"><FileTextIcon /><span className="partner-eyebrow">SPONSORSHIP BROCHURE</span><strong>{sponsorshipSettings?.brochure_title || 'Download Sponsorship Brochure'}</strong><p>{sponsorshipSettings?.brochure_url ? 'A brochure is linked to the public download button.' : 'Add a PDF or a link so potential partners can explore your offer.'}</p>{sponsorshipSettings?.brochure_url ? <button type="button" className="partner-button" onClick={handleBrochureDownload}><Download />Download</button> : <button type="button" className="partner-button" onClick={() => setIsEditingSettings(true)}>Add a brochure<PlusIcon /></button>}</aside>
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
