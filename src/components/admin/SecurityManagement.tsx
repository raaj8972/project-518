import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { dualRead, dualInsert, dualUpdate, dualDelete } from '../../lib/dualDb';
import { useToast } from '../../components/ToastProvider';
import { Shield, Crown, Eye, Trash, Plus, Clock, CheckCircle2, FileUp, Download, RefreshCw, Lock, Calendar, AlertTriangle, UserPlus, CheckSquare, Square, XCircle, Search, Settings, History, Users, Palette, Loader2, Image as ImageIcon } from 'lucide-react';
import { QRCodeGenerator } from './QRCodeGenerator';
import { useData } from '../../context/DataContext';
import { DEFAULT_RULES, ValidationRule } from '../../utils/validationRules';
import { PassTemplateDesigner } from './PassTemplateDesigner';
import { generatePassPDF, generateA4SheetPDF } from '../../utils/pdfGenerator';
import { generatePassImages } from '../../utils/passImageGenerator';

interface SecurityUser {
  id: number;
  username: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

interface PassRegistration {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  pass_id: string | null;
  rejection_reason: string | null;
}

interface VipPass {
  id: string;
  pass_id: string;
  participant_name: string | null;
  pass_type: string;
  created_at: string;
  notes: string | null;
  pass_token: string;
  is_used: boolean;
  is_active: boolean;
  valid_date?: string;
  is_hidden_from_council?: boolean;
}

interface SecurityManagementProps {
  defaultTab?: 'users' | 'passes' | 'vip' | 'settings' | 'rules' | 'history' | 'council' | 'design';
}

export const SecurityManagement: React.FC<SecurityManagementProps> = ({ defaultTab = 'users' }) => {
  const { securitySettings, updateSecuritySettings } = useData();
  const { push: toast } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'passes' | 'vip' | 'settings' | 'rules' | 'history' | 'council' | 'design'>(defaultTab);
  const [securityUsers, setSecurityUsers] = useState<SecurityUser[]>([]);
  const [passRegistrations, setPassRegistrations] = useState<PassRegistration[]>([]);
  const [vipPasses, setVipPasses] = useState<VipPass[]>([]);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateVIP, setShowCreateVIP] = useState(false);
  const [showBulkVIP, setShowBulkVIP] = useState(false);
  const [selectedPass, setSelectedPass] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [includeName, setIncludeName] = useState(true); // Global toggle
  const [perPassNameVisibility, setPerPassNameVisibility] = useState<Record<string, boolean>>({}); // Overrides: ID -> boolean
  const [importData, setImportData] = useState<any[]>([]);
  const [passUsage, setPassUsage] = useState<Record<string, number[]>>({}); // PassID -> [Day1, Day2]
  const [editingPassId, setEditingPassId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState('');
  const [selectedVipIds, setSelectedVipIds] = useState<Set<string>>(new Set());
  const [validationRules, setValidationRules] = useState<ValidationRule[]>(DEFAULT_RULES);
  const [rulesTableReady, setRulesTableReady] = useState(true);
  const [ruleLoadError, setRuleLoadError] = useState<string | null>(null);
  const [vipSearch, setVipSearch] = useState('');

  // Derive current day number (IST)
  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const currentDayIdx = (securitySettings?.event_dates || []).indexOf(todayIST);
  const currentDayNum = currentDayIdx !== -1 ? currentDayIdx + 1 : null;

  const filteredVipPasses = vipPasses.filter(p => {
    const term = vipSearch.toLowerCase();
    return (
      (p.participant_name?.toLowerCase() || '').includes(term) ||
      (p.notes?.toLowerCase() || '').includes(term) || 
      (p.pass_token?.toLowerCase() || '').includes(term)
    );
  });

  const toggleSelectAll = () => {
    const allFilteredSelected = filteredVipPasses.length > 0 && filteredVipPasses.every(p => selectedVipIds.has(p.id));
    
    if (allFilteredSelected) {
      const next = new Set(selectedVipIds);
      filteredVipPasses.forEach(p => next.delete(p.id));
      setSelectedVipIds(next);
    } else {
      const next = new Set(selectedVipIds);
      filteredVipPasses.forEach(p => next.add(p.id));
      setSelectedVipIds(next);
    }
  };

  const toggleSelectVip = (id: string) => {
    const next = new Set(selectedVipIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedVipIds(next);
  };

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
  });

  const [newVIP, setNewVIP] = useState({
    name: '',
    notes: '',
    validDate: '',
  });

  const [councilPassword, setCouncilPassword] = useState('');

  const updateCouncilPassword = async () => {
    if (!councilPassword.trim()) return toast({ message: 'Enter a password', type: 'error' });
    setLoading(true);
    try {
      const { error } = await supabase.rpc('set_council_password', { p_password: councilPassword });
      if (error) throw error;
      toast({ message: 'Council password updated', type: 'success' });
      setCouncilPassword('');
    } catch (err: any) {
       toast({ message: err.message || 'Failed to update', type: 'error' });
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Ensure fonts are loaded for Canvas generation (PNG)
  useEffect(() => {
    const id = 'google-fonts-anton';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }, []);

  const fetchPassUsage = async () => {
    if (vipPasses.length === 0) return;
    const ids = vipPasses.map(p => p.id);
    const { data } = await dualRead({
      table: 'pass_scans',
      in: ['pass_id', ids],
      eq: ['scan_result', 'valid']
    });
    
    if (data) {
       const usage: Record<string, number[]> = {};
       data.forEach((scan: any) => {
          // Robust Date Matching
           const scanDate = new Date(scan.scanned_at);
           
           // Check both IST and UTC date strings to handle edge cases
           const istDate = scanDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
           const utcDate = scanDate.toISOString().split('T')[0];

           let dayIdx = (securitySettings?.event_dates || []).indexOf(istDate);
           if (dayIdx === -1) {
             dayIdx = (securitySettings?.event_dates || []).indexOf(utcDate);
           }

           if (dayIdx !== -1) {
              if (!usage[scan.pass_id]) usage[scan.pass_id] = [];
              if (!usage[scan.pass_id].includes(dayIdx + 1)) {
                 usage[scan.pass_id].push(dayIdx + 1);
              }
           }
       });
       setPassUsage(usage);
    }
  };

  useEffect(() => {
    if (activeTab === 'vip') {
      fetchPassUsage();
    }
  }, [vipPasses, activeTab, securitySettings]);

  const handleToggleCouncilVisibility = async (passId: string, currentHidden: boolean) => {
    try {
       // Optimistic update
       setVipPasses(prev => prev.map(p => 
          p.id === passId ? { ...p, is_hidden_from_council: !currentHidden } : p
       ));

       const { error } = await supabase.rpc('toggle_pass_council_visibility', {
          p_pass_id: passId,
          p_hidden: !currentHidden
       });

       if (error) {
          // Revert on error
          setVipPasses(prev => prev.map(p => 
             p.id === passId ? { ...p, is_hidden_from_council: currentHidden } : p
          ));
          throw error;
       }
       toast({ message: !currentHidden ? 'Pass hidden from Council' : 'Pass visible to Council', type: 'success' });
    } catch (err: any) {
       console.error(err);
       toast({ message: 'Failed to update visibility', type: 'error' });
    }
  };

  const handleResetPass = async (passId: string) => {
    if (!window.confirm('Reset this pass? This will clear all entry history and allow it to be used again as new.')) return;
    try {
      const { error } = await supabase.rpc('reset_pass_usage', { p_pass_id: passId });
      if (error) throw error;
      toast({ message: 'Pass usage reset', type: 'success' });
      loadData(); // Refresh list
    } catch (err) {
      console.error(err);
      toast({ message: 'Failed to reset pass', type: 'error' });
    }
  };

  const handleResetDay = async (passId: string, dateStr: string, dayNum: number) => {
    if (!window.confirm(`Remove entry record for Day ${dayNum} (${dateStr})?`)) return;
    try {
      const { error } = await supabase.rpc('delete_pass_scan_for_date', { 
        p_pass_id: passId, 
        p_date: dateStr 
      });
      if (error) throw error;
      toast({ message: `Day ${dayNum} entry removed`, type: 'success' });
      await loadData(); // Reload pass status and trigger fetchPassUsage via effect
    } catch (err) {
      console.error(err);
      toast({ message: 'Failed to update scan', type: 'error' });
    }
  };

  const loadData = async () => {
    if (activeTab === 'users') {
      const { data: users } = await dualRead({
        table: 'security_users',
        order: ['created_at', { ascending: false }]
      });
      if (users) setSecurityUsers(users);
    } else if (activeTab === 'passes') {
      const { data: passes } = await dualRead({
        table: 'pass_registrations',
        order: ['created_at', { ascending: false }]
      });
      if (passes) setPassRegistrations(passes);
    } else if (activeTab === 'vip') {
      const { data: vip } = await dualRead({
        table: 'entry_passes',
        eq: ['pass_type', 'vip'],
        order: ['created_at', { ascending: false }]
      });
      if (vip) setVipPasses(vip);
    } else if (activeTab === 'rules') {
      try {
        const { data } = await dualRead({
          table: 'validation_rules',
          order: ['priority', { ascending: false }]
        });
        
        if (data && data.length > 0) {
          setValidationRules(data);
          setRulesTableReady(true);
        } else {
          // Table exists but empty, use defaults (and maybe prompt to init)
          setValidationRules(DEFAULT_RULES);
          setRulesTableReady(true);
        }
      } catch (err: any) {
        console.error('Failed to load rules:', err);
        setRulesTableReady(false);
        // Special case for Firestore "missing table" (collection) is handled by empty data normally
        // but if there's a permission error or similar, we catch it here.
        if (!ruleLoadError) setRuleLoadError(err.message || 'Unknown failed to load');
      }
    } else if (activeTab === 'history') {
      const { data: history } = await dualRead({
        table: 'pass_scans',
        order: ['scanned_at', { ascending: false }],
        limit: 200
      });
      if (history) setScanHistory(history);
    }
  };

  useEffect(() => {
    // Real-time synchronization for changes
    const channel = supabase
      .channel('security_management_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pass_scans' 
      }, () => {
        loadData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'entry_passes' 
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  const handleToggleRule = async (rule: ValidationRule) => {
    if (!rulesTableReady) return toast({ message: 'Database table not ready', type: 'error' });
    
    // Optimistic update
    const updated = { ...rule, is_active: !rule.is_active };
    setValidationRules(prev => prev.map(r => r.id === rule.id ? updated : r));
    
    try {
      await dualUpdate('validation_rules', updated.id, updated);
      toast({ message: `Rule ${updated.is_active ? 'enabled' : 'disabled'}`, type: 'success' });
    } catch (err) {
      console.error(err);
      toast({ message: 'Failed to save rule', type: 'error' });
      loadData(); // Revert
    }
  };

  const handleRuleConfigUpdate = async (ruleId: string, newConfig: any) => {
    if (!rulesTableReady) return toast({ message: 'Database table not ready', type: 'error' });
    
    try {
      setLoading(true);
      const rule = validationRules.find(r => r.id === ruleId);
      if (!rule) return;
      
      const updated = { ...rule, config: newConfig };
      
      await dualUpdate('validation_rules', updated.id, updated);
      
      setValidationRules(prev => prev.map(r => r.id === ruleId ? updated : r));
      toast({ message: 'Rule configuration updated', type: 'success' });
    } catch (err) {
      console.error(err);
      toast({ message: 'Failed to update config', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (type: 'date_restriction' | 'time_window' | 'capacity') => {
    if (!rulesTableReady) return toast({ message: 'Database not ready', type: 'error' });
    
    try {
      setLoading(true);
      const newRule: Partial<ValidationRule> = {
        rule_name: type === 'date_restriction' ? 'New Date Rule' : type === 'time_window' ? 'New Time Window' : 'New Capacity Limit',
        rule_type: type,
        pass_type: undefined, // Apply to all by default
        config: type === 'date_restriction' ? { allowedDates: [] } : type === 'time_window' ? { startTime: '09:00', endTime: '17:00' } : { maxCapacity: 100 },
        is_active: false,
        priority: 10
      };

      const newId = `rule_${Date.now()}`;
      const inserted = { ...newRule, id: newId } as ValidationRule;
      await dualInsert('validation_rules', inserted);
      
      setValidationRules(prev => [inserted, ...prev]);
      toast({ message: 'Rule created', type: 'success' });
    } catch (err: any) {
      console.error(err);
      toast({ message: err.message || 'Failed to create rule', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!rulesTableReady) return toast({ message: 'Database not ready', type: 'error' });
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      setLoading(true);
      await dualDelete('validation_rules', id);
      
      setValidationRules(prev => prev.filter(r => r.id !== id));
      toast({ message: 'Rule deleted', type: 'success' });
    } catch (err: any) {
      toast({ message: err.message || 'Failed to delete rule', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSecurityUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.rpc('create_security_user', {
        p_username: newUser.username,
        p_password: newUser.password,
        p_full_name: newUser.full_name,
      });

      if (error) throw error;

      toast({ message: 'Security user created successfully', type: 'success' });
      setNewUser({ username: '', password: '', full_name: '' });
      setShowCreateUser(false);
      loadData();
    } catch (error: any) {
      toast({ message: error.message || 'Failed to create user', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSecurityUser = async (id: number, username: string) => {
    if (!window.confirm(`Are you sure you want to delete the security user "@${username}"?`)) return;
    try {
      const { error } = await supabase.rpc('delete_security_user', { p_user_id: id });
      if (error) throw error;
      toast({ message: 'Security user deleted', type: 'success' });
      loadData();
    } catch (err: any) {
      console.error(err);
      toast({ message: err.message || 'Failed to delete user', type: 'error' });
    }
  };

  const handleApprovePass = async (passRegId: string) => {
    setLoading(true);

    try {
      const { error } = await supabase.rpc('approve_pass_registration', {
        p_pass_reg_id: passRegId,
      });

      if (error) throw error;

      toast({ message: 'Pass approved and generated', type: 'success' });
      loadData();
    } catch (error: any) {
      toast({ message: error.message || 'Failed to approve pass', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPass = async (passRegId: string) => {
    const reason = prompt('Rejection reason (optional):');
    
    try {
      await dualUpdate('pass_registrations', passRegId, { status: 'rejected', rejection_reason: reason });

      toast({ message: 'Pass registration rejected', type: 'success' });
      loadData();
    } catch (error: any) {
      toast({ message: 'Failed to reject pass', type: 'error' });
    }
  };

  const handleCreateVIP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.rpc('create_vip_pass_v3', {
        p_name: newVIP.name || null,
        p_notes: newVIP.notes || null,
        p_valid_date: newVIP.validDate || null,
      });

      if (error) throw error;

      toast({ message: 'VIP pass created successfully', type: 'success' });
      setNewVIP({ name: '', notes: '', validDate: '' });
      setShowCreateVIP(false);
      loadData(); // Refresh the VIP passes list
    } catch (error: any) {
      toast({ message: error.message || 'Failed to create VIP pass', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return;

        // Dynamically load XLSX library only when needed
        const XLSX = await import('xlsx');
        
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          toast({ message: 'File is empty', type: 'error' });
          return;
        }

        // Validate structure (expecting 'name' or 'Notes')
        const firstRow = data[0] as any;
        const nameKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'name' || k.toLowerCase() === 'participant_name');
        
        if (!nameKey) {
          toast({ message: 'File must have a "name" column', type: 'error' });
          return;
        }

        setImportData(data);
        toast({ message: `Loaded ${data.length} records. Click "Process" to create passes.`, type: 'success' });
      } catch (err) {
        toast({ message: 'Failed to parse file', type: 'error' });
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleProcessBulk = async () => {
    if (importData.length === 0) return;
    setProcessingBulk(true);
    let successCount = 0;
    let failCount = 0;

    toast({ message: `Processing ${importData.length} VIP passes...`, type: 'info' });

    try {
      for (const row of importData) {
        const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name' || k.toLowerCase() === 'participant_name');
        const notesKey = Object.keys(row).find(k => k.toLowerCase() === 'notes' || k.toLowerCase() === 'internal_notes');
        
        const name = nameKey ? row[nameKey] : null;
        const notes = notesKey ? row[notesKey] : null;

        const { error } = await supabase.rpc('create_vip_pass_v3', {
          p_name: name,
          p_notes: notes,
        });

        if (error) {
          console.error(`Failed to create VIP for ${name}:`, error);
          failCount++;
        } else {
          successCount++;
        }
        
        // Update toast every 10 records or at the end
        if (successCount % 10 === 0 || successCount === importData.length) {
          toast({ message: `Processing: ${successCount}/${importData.length} done...`, type: 'info' });
        }
      }

      if (failCount > 0) {
        toast({ message: `Batch complete: ${successCount} created, ${failCount} failed`, type: 'success' });
      } else {
        toast({ message: `Successfully created ${successCount} VIP passes!`, type: 'success' });
      }
      
      setImportData([]);
      setShowBulkVIP(false);
      loadData();
    } catch (err) {
      toast({ message: 'Bulk processing failed', type: 'error' });
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleDownloadPDF = async (passOrPasses: VipPass | VipPass[], specificDay?: number) => {
    const config = securitySettings?.pass_template_config || {};
    const eventDates = securitySettings?.event_dates || [];
    
    // Fallback: If no designs exist at all, we can't do anything
    if (Object.keys(config).length === 0) {
      toast({ message: 'Please configure a pass design in the "Pass Design" tab first.', type: 'error' });
      setActiveTab('design');
      return;
    }

    // Determine which days to generate
    let selectedDays: number[] = [];
    if (specificDay !== undefined) {
      selectedDays = [specificDay];
    } else if (eventDates.length > 0) {
      selectedDays = eventDates.map((_, i) => i);
    } else {
      // Fallback to whatever is configured in design if no event dates
      selectedDays = Object.keys(config).map(k => parseInt(k.replace('day_', '')));
    }
    
    // Security check: ensure we have a template for each selected day (with fallback)
    const processedConfig: Record<string, any> = { ...config };
    const defaultTemplate = config['day_0'] || config[Object.keys(config)[0]];

    selectedDays.forEach(dayIndex => {
      const key = `day_${dayIndex}`;
      if (!processedConfig[key]) {
        processedConfig[key] = defaultTemplate; // Fallback to Day 0 or first available
      }
    });

    const passes = Array.isArray(passOrPasses) ? passOrPasses : [passOrPasses];
    toast({ message: 'Generating PDF...', type: 'info' });

    try {
      await generatePassPDF({
        passes: passes.map(p => ({
          id: p.id,
          token: p.pass_token,
          type: p.pass_type,
          name: p.participant_name || undefined,
          valid_date: p.valid_date,
          includeName: perPassNameVisibility[p.id] // Pass specific override
        })),
        templateConfigs: securitySettings?.pass_template_config || {},
        selectedDays: specificDay !== undefined ? [specificDay] : (securitySettings?.event_dates || []).map((_, i) => i),
        eventDates: eventDates,
        onProgress: (pct) => {
          toast({ message: `Generating PDF: ${pct}%`, type: 'info' });
        },
        includeName // Global default if pass specific is undefined
      });
      toast({ message: 'PDF downloaded!', type: 'success' });
    } catch (e) {
      console.error(e);
      toast({ message: 'Failed to generate PDF', type: 'error' });
    }
  };

  const handleDownloadA4PDF = async (passOrPasses: VipPass | VipPass[], _specificDay?: number) => {
    const config = securitySettings?.pass_template_config || {};
    const eventDates = securitySettings?.event_dates || [];
    
    if (Object.keys(config).length === 0) {
      toast({ message: 'Configure pass design first', type: 'error' });
      return;
    }

    // Auto-Sync Styles: Ensure all days use the same font/styling as the first day (source of truth)
    // This solves the issue where users customize Day 1 but forget Day 2/3.
    const syncedConfig = { ...config };
    const days = Object.keys(config).filter(k => k.startsWith('day_')).sort();
    if (days.length > 0) {
       const source = config[days[0]]?.name;
       if (source) {
          days.forEach(d => {
             if (syncedConfig[d] && syncedConfig[d].name) {
                syncedConfig[d] = {
                   ...syncedConfig[d],
                   name: {
                      ...syncedConfig[d].name!,
                      fontFamily: source.fontFamily,
                      bold: source.bold,
                      fontSize: source.fontSize,
                      color: source.color,
                      align: source.align
                   }
                };
             }
          });
       }
    }

    const passes = Array.isArray(passOrPasses) ? passOrPasses : [passOrPasses];
    toast({ message: 'Generating A4 Sheet...', type: 'info' });

    try {
      await generateA4SheetPDF({
        passes: passes.map(p => ({
          id: p.id,
          token: p.pass_token,
          type: p.pass_type,
          name: p.participant_name || undefined,
          valid_date: p.valid_date,
          includeName: perPassNameVisibility[p.id]
        })),
        templateConfigs: syncedConfig,
        selectedDays: (securitySettings?.event_dates || []).map((_, i) => i),
        eventDates,
        onProgress: (pct) => {
          toast({ message: `Generating A4: ${pct}%`, type: 'info' });
        },
        includeName
      });
      toast({ message: 'A4 Sheet downloaded!', type: 'success' });
    } catch (e) {
      console.error(e);
      toast({ message: 'Failed to generate A4 Sheet', type: 'error' });
    }
  };

  const handleDownloadImage = async (passOrPasses: VipPass | VipPass[], format: 'png' | 'jpg' = 'png', specificDay?: number) => {
    const config = securitySettings?.pass_template_config || {};
    const eventDates = securitySettings?.event_dates || [];
    
    if (Object.keys(config).length === 0) {
      toast({ message: 'Please configure a pass design in the "Pass Design" tab first.', type: 'error' });
      setActiveTab('design');
      return;
    }

    const passes = Array.isArray(passOrPasses) ? passOrPasses : [passOrPasses];
    toast({ message: `Generating ${format.toUpperCase()}...`, type: 'info' });

    try {
      await generatePassImages({
        passes: passes.map(p => ({
          id: p.id,
          token: p.pass_token,
          type: p.pass_type,
          name: p.participant_name || undefined,
          valid_date: p.valid_date,
          includeName: perPassNameVisibility[p.id]
        })),
        templateConfigs: securitySettings?.pass_template_config || {},
        selectedDays: specificDay !== undefined ? [specificDay] : (securitySettings?.event_dates || []).map((_, i) => i),
        eventDates: eventDates,
        format,
        onProgress: (pct) => {
          toast({ message: `Generating ${format.toUpperCase()}: ${pct}%`, type: 'info' });
        },
        includeName,
      });
      toast({ message: `${format.toUpperCase()} downloaded!`, type: 'success' });
    } catch (e) {
      console.error(e);
      toast({ message: 'Failed to generate images', type: 'error' });
    }
  };

  const downloadTemplate = async () => {
    const template = [
      { name: 'John Doe', notes: 'Sponsor guest' },
      { name: 'Jane Smith', notes: 'Core team member' },
    ];
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'vip_import_template.xlsx');
  };

  const handleDeletePassRegistration = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the registration for "${name}"? This will also delete any generated pass.`)) return;
    try {
      const { error } = await supabase.rpc('delete_pass_registration', { p_reg_id: id });
      if (error) throw error;
      toast({ message: 'Registration deleted', type: 'success' });
      loadData();
    } catch (err: any) {
      console.error(err);
      toast({ message: err.message || 'Failed to delete registration', type: 'error' });
    }
  };

  const handleDeleteVIPPass = async (id: string, name: string | null) => {
    const displayName = name || 'Unnamed VIP';
    if (!window.confirm(`Are you sure you want to delete the VIP pass for "${displayName}"? All scan records will be lost.`)) return;
    try {
      const { error } = await supabase.rpc('delete_entry_pass_v3', { p_pass_id: id });
      if (error) throw error;
      toast({ message: 'VIP pass deleted', type: 'success' });
      loadData();
    } catch (err: any) {
      console.error(err);
      toast({ message: err.message || 'Failed to delete pass', type: 'error' });
    }
  };

  const handleUpdatePassDate = async (passId: string, newDate: string) => {
    try {
      const { error } = await supabase.rpc('update_pass_date', {
        p_pass_id: passId,
        p_new_date: newDate || null, // Allow clearing the date
      });

      if (error) throw error;

      toast({ message: 'Pass date updated', type: 'success' });
      setEditingPassId(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast({ message: err.message || 'Failed to update date', type: 'error' });
    }
  };

  const viewPassQR = async (passRegId: string) => {
    const { data } = await supabase
      .from('entry_passes')
      .select('*')
      .eq('pass_registration_id', passRegId)
      .single();

    if (data) {
      setSelectedPass(data);
    } else {
      toast({ message: 'Pass not generated yet', type: 'error' });
    }
  };

  return (
    <div className="space-y-8 min-h-screen pb-20">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12 relative z-10">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5 group-hover:scale-110 transition-all duration-500">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
              Security <span className="text-xs not-italic font-black bg-indigo-500 text-white px-2 py-0.5 rounded tracking-widest uppercase">OS</span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Global Protocol Governor</span>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status: Neural Link Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="superia-glass-card p-2 rounded-[1.5rem] border-white/5 shadow-2xl flex flex-wrap gap-1.5 sticky top-24 z-40 backdrop-blur-3xl bg-black/40">
        {[
          { id: 'users', label: 'Nodes', icon: Users, color: 'indigo' },
          { id: 'passes', label: 'Inbound', icon: FileUp, color: 'blue' },
          { id: 'vip', label: 'Matrix', icon: Crown, color: 'yellow' },
          { id: 'settings', label: 'Config', icon: Settings, color: 'purple' },
          { id: 'rules', label: 'Firewall', icon: Shield, color: 'emerald' },
          { id: 'history', label: 'Audit', icon: History, color: 'rose' },
          { id: 'council', label: 'Council', icon: Lock, color: 'amber' },
          { id: 'design', label: 'Studio', icon: Palette, color: 'teal' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2.5 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 relative overflow-hidden group/tab
              ${activeTab === tab.id
                ? 'bg-white/10 text-white shadow-xl border border-white/10 translate-y-[-2px]'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'}
            `}
          >
            {activeTab === tab.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-blue-500/20 to-indigo-500/20 animate-pulse" />
            )}
            <tab.icon size={14} className={`relative z-10 ${activeTab === tab.id ? 'animate-pulse' : 'group-hover/tab:scale-110 transition-transform'}`} />
            <span className="relative z-10">{tab.label}</span>
            {activeTab === tab.id && (
               <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />
            )}
          </button>
        ))}
      </div>

      {/* Security Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase">System Nodes</h3>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest opacity-60">Security Personnel Directory</p>
            </div>
            <button
              onClick={() => setShowCreateUser(!showCreateUser)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg hover:shadow-indigo-500/20 border border-indigo-400/30"
            >
              <UserPlus size={14} />
              Create Node
            </button>
          </div>

          {showCreateUser && (
            <form onSubmit={handleCreateSecurityUser} className="superia-glass-card p-8 rounded-3xl border-white/10 shadow-2xl space-y-6 animate-in fade-in slide-in-from-top-4">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-widest ml-1">Username</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-gray-600"
                    placeholder="e.g. jdoe_admin"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-widest ml-1">Password</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-widest ml-1">Full Identity</label>
                  <input
                    type="text"
                    required
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-gray-600"
                    placeholder="Full Legal Name"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Terminate
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin" /> Initializing...
                    </div>
                  ) : 'Initialize Node'}
                </button>
              </div>
            </form>
          )}

          {securityUsers.length === 0 ? (
            <div className="superia-glass-card p-12 text-center rounded-3xl border-white/10 opacity-60">
              <Users size={32} className="mx-auto text-gray-500 mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Zero security nodes detected in the matrix</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {securityUsers.map((user) => (
                <div key={user.id} className="superia-glass-card p-5 rounded-2xl border-white/10 shadow-xl flex items-center justify-between hover:bg-white/5 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-colors" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-indigo-400 shadow-inner group-hover:scale-105 transition-transform">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-black text-sm tracking-tight leading-tight">{user.full_name}</p>
                      <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest opacity-80 mt-0.5">@{user.username}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${user.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                          {user.is_active ? 'Active Node' : 'Suspended'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSecurityUser(user.id, user.username)}
                    className="relative z-10 p-2 text-gray-500 hover:text-red-400 transition-colors bg-white/5 rounded-lg opacity-0 group-hover:opacity-100"
                    title="Purge Node"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pass Registrations Tab */}
      {activeTab === 'passes' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase">Incoming Protocols</h3>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest opacity-60">Pending & Processed Requests</p>
            </div>
            {passRegistrations.filter(p => p.status === 'pending').length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2 flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                <AlertTriangle size={14} className="text-amber-400 animate-pulse" />
                <span className="text-amber-400 font-black text-[10px] uppercase tracking-widest">
                  {passRegistrations.filter(p => p.status === 'pending').length} Critical Approvals
                </span>
              </div>
            )}
          </div>

          {passRegistrations.length === 0 ? (
            <div className="superia-glass-card p-12 text-center rounded-3xl border-white/10 opacity-60">
              <FileUp size={32} className="mx-auto text-gray-500 mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No registration data streams detected</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {passRegistrations.map((reg) => (
                <div key={reg.id} className="superia-glass-card p-6 rounded-3xl border-white/10 shadow-xl hover:bg-white/5 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2" />
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-indigo-400 shadow-inner group-hover:bg-indigo-500/10 transition-all">
                        {reg.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <p className="text-white font-black text-lg tracking-tight">{reg.full_name}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="text-gray-400 text-xs font-bold font-mono opacity-80">{reg.email}</p>
                          <span className="text-white/10 text-[10px]">•</span>
                          <p className="text-gray-400 text-xs font-bold font-mono opacity-80">{reg.phone}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock size={12} className="text-gray-500" />
                          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                            {new Date(reg.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end gap-4">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-[0.2em] border ${
                        reg.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                          : reg.status === 'rejected'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                      }`}>
                        {reg.status.toUpperCase()}
                      </span>

                      <div className="flex items-center gap-2">
                        {reg.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprovePass(reg.id)}
                              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                            >
                              Authorize
                            </button>
                            <button
                              onClick={() => handleRejectPass(reg.id)}
                              className="px-6 py-2 bg-white/5 hover:bg-white/10 text-red-400 hover:text-red-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/10 active:scale-95"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {reg.status === 'approved' && (
                          <button
                            onClick={() => viewPassQR(reg.id)}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                          >
                            <Eye size={12} />
                            Deploy Pass
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePassRegistration(reg.id, reg.full_name)}
                          className="p-2 bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all rounded-xl border border-white/10 hover:border-red-500/20"
                          title="Purge Protocol"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIP Passes Tab */}
      {/* VIP Passes Tab */}
      {activeTab === 'vip' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                <Crown size={24} className="text-yellow-500" />
                Access Matrix <span className="text-[10px] not-italic font-black bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded tracking-widest uppercase border border-yellow-500/20">VIP</span>
              </h3>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">High-Priority Personnel Management</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <button
                onClick={() => setShowCreateVIP(!showCreateVIP)}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95"
              >
                <Plus size={14} /> Initialize VIP
              </button>
              <button
                onClick={() => setShowBulkVIP(!showBulkVIP)}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10"
              >
                <FileUp size={14} /> Bulk Uplink
              </button>
              {Object.keys(securitySettings?.pass_template_config || {}).length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${
                    filteredVipPasses.length > 0 && filteredVipPasses.every(p => selectedVipIds.has(p.id))
                      ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-lg shadow-yellow-500/5'
                      : 'bg-white/5 text-gray-500 border-white/10 hover:text-white'
                  }`}
                >
                  {filteredVipPasses.length > 0 && filteredVipPasses.every(p => selectedVipIds.has(p.id)) ? <CheckSquare size={14} /> : <Square size={14} />}
                  <span>{filteredVipPasses.length > 0 && filteredVipPasses.every(p => selectedVipIds.has(p.id)) ? 'De-select All' : 'Select Sector'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col xl:flex-row items-center gap-4">
            <div className="relative flex-1 group w-full">
              <Search className="w-4 h-4 text-gray-500 absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:text-yellow-500 transition-colors" />
              <input 
                type="text" 
                value={vipSearch}
                onChange={(e) => setVipSearch(e.target.value)}
                placeholder="Scan for identity, protocol notes, or token hash..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] pl-14 pr-6 py-5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-4 focus:ring-yellow-500/5 transition-all font-bold"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-600 uppercase tracking-widest tabular-nums">
                 {filteredVipPasses.length} <span className="opacity-30">/</span> {vipPasses.length} DETECTED
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 items-center justify-end w-full xl:w-auto">
               <label className="flex items-center gap-3 cursor-pointer bg-white/5 px-5 py-3 rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-95 group">
                  <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${includeName ? 'bg-yellow-500 border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-black/40 border-white/20 group-hover:border-white/40'}`}>
                     {includeName && <CheckCircle2 size={10} className="text-black" strokeWidth={4} />}
                  </div>
                  <input 
                    type="checkbox" 
                    checked={includeName} 
                    onChange={(e) => setIncludeName(e.target.checked)} 
                    className="hidden" 
                  />
                  <span className="text-[10px] font-black text-gray-400 group-hover:text-white uppercase tracking-widest select-none transition-colors">ID Visibility</span>
               </label>

               <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10">
                  {(securitySettings?.event_dates || []).length > 1 ? (
                    <div className="flex gap-1">
                      {(securitySettings?.event_dates || []).map((_, idx) => (
                        <button
                          key={`pdf-${idx}`}
                          onClick={() => handleDownloadPDF(selectedVipIds.size > 0 ? vipPasses.filter(p => selectedVipIds.has(p.id)) : filteredVipPasses, idx)}
                          className="px-4 py-2 bg-white/5 hover:bg-indigo-500 hover:text-white text-gray-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          D{idx + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => handleDownloadPDF(selectedVipIds.size > 0 ? vipPasses.filter(p => selectedVipIds.has(p.id)) : filteredVipPasses)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                      >
                        FULL PDF
                      </button>
                    </div>
                  ) : (
                    <button
                       onClick={() => handleDownloadPDF(selectedVipIds.size > 0 ? vipPasses.filter(p => selectedVipIds.has(p.id)) : filteredVipPasses)}
                       className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      GENERATE PDF
                    </button>
                  )}
               </div>
               
               <button
                 onClick={() => handleDownloadA4PDF(selectedVipIds.size > 0 ? vipPasses.filter(p => selectedVipIds.has(p.id)) : filteredVipPasses)}
                 className="px-6 py-3 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white rounded-2xl border border-purple-500/20 transition-all font-black text-[10px] uppercase tracking-widest"
               >
                 A4 SHEET
               </button>
            </div>
          </div>

          {showBulkVIP && (
            <div className="superia-glass-card p-8 rounded-3xl border-white/10 shadow-2xl space-y-6 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight uppercase">Bulk Import Nexus</h3>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest opacity-60">Upload CSV/Excel Protocol</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                >
                  <Download className="w-4 h-4" /> Download Template
                </button>
              </div>

              <div className="flex flex-col lg:flex-row gap-4 items-center p-6 bg-black/20 rounded-2xl border border-white/5">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
                
                {importData.length > 0 && (
                  <button
                    onClick={handleProcessBulk}
                    disabled={processingBulk}
                    className="w-full lg:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    {processingBulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {processingBulk ? 'Synchronizing...' : `Inject ${importData.length} Nodes`}
                  </button>
                )}
              </div>
            </div>
          )}

          {showCreateVIP && (
            <form onSubmit={handleCreateVIP} className="superia-glass-card p-8 rounded-3xl border-white/10 shadow-2xl space-y-6 animate-in fade-in slide-in-from-top-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-widest ml-1">Identity Designation</label>
                  <input
                    type="text"
                    value={newVIP.name}
                    onChange={(e) => setNewVIP({ ...newVIP, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-gray-600"
                    placeholder="Full Subject Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-widest ml-1">Temporal Lockout</label>
                  <input
                    type="date"
                    value={newVIP.validDate}
                    onChange={(e) => setNewVIP({ ...newVIP, validDate: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-widest ml-1">Protocol Notes</label>
                <textarea
                  value={newVIP.notes}
                  onChange={(e) => setNewVIP({ ...newVIP, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-gray-600 resize-none"
                  rows={3}
                  placeholder="Additional security clearance details..."
                />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCreateVIP(false)}
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50"
                >
                  {loading ? 'Initializing...' : 'Authorize VIP'}
                </button>
              </div>
            </form>
          )}

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {filteredVipPasses.length === 0 ? (
              <div className="superia-glass-card p-12 text-center rounded-3xl border-white/10 opacity-60">
                <Crown size={32} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                  {vipPasses.length === 0 ? 'Zero VIP signals detected' : 'No matches in the matrix'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                {filteredVipPasses.map((pass) => (
                  <div key={pass.id} className={`group relative rounded-[2rem] transition-all duration-700 ${
                    selectedVipIds.has(pass.id) 
                      ? 'bg-indigo-500/[0.08] border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30' 
                      : 'bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.04] shadow-xl'
                  }`}>
                    {/* Holographic Accent */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[2rem]" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-colors" />
                    
                    <div className="p-8 relative z-10">
                      <div className="flex items-start gap-4 mb-6">
                        <button 
                          onClick={() => toggleSelectVip(pass.id)}
                          className={`mt-1 flex-shrink-0 w-6 h-6 rounded-lg border transition-all flex items-center justify-center ${
                            selectedVipIds.has(pass.id) 
                              ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                              : 'bg-white/5 border-white/10 text-transparent hover:border-white/30'
                          }`}
                        >
                          <CheckCircle2 size={12} strokeWidth={3} className={selectedVipIds.has(pass.id) ? 'scale-100 opacity-100' : 'scale-75 opacity-0'} />
                        </button>
                        
                        <div className="flex-1">
                          <h4 className="text-xl font-black text-white tracking-tight leading-none group-hover:text-indigo-400 transition-colors">
                            {pass.participant_name || <span className="text-gray-600 italic uppercase text-[10px] tracking-[0.2em] opacity-50 font-bold">Anonymous Protocol</span>}
                          </h4>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest font-mono opacity-60">#{pass.pass_token.slice(-8)}</span>
                            <div className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{new Date(pass.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-4 py-1.5 rounded-full text-[8px] font-black tracking-[0.2em] uppercase border transition-all duration-500 ${
                            (pass.pass_type === 'vip' ? (currentDayNum && passUsage[pass.id]?.includes(currentDayNum)) : pass.is_used)
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                          }`}>
                            {(pass.pass_type === 'vip' ? (currentDayNum && passUsage[pass.id]?.includes(currentDayNum)) : pass.is_used) ? 'LOGGED' : 'STANDBY'}
                          </span>
                        </div>
                      </div>

                      {pass.notes && (
                        <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 text-[11px] font-medium text-gray-400 leading-relaxed italic mb-6 border-l-2 border-l-indigo-500/50">
                          {pass.notes}
                        </div>
                      )}

                      <div className="space-y-4">
                        {/* Status Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Date Validity / Editor */}
                          <div className="col-span-1">
                            {editingPassId === pass.id ? (
                              <div className="p-1.5 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 flex items-center gap-2 animate-in slide-in-from-top-2">
                                 <input 
                                   type="date" 
                                   value={editDateValue}
                                   onChange={e => setEditDateValue(e.target.value)}
                                   className="bg-black/40 text-white text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-white/10 focus:border-indigo-500 outline-none w-full"
                                 />
                                 <div className="flex gap-1">
                                   <button onClick={() => handleUpdatePassDate(pass.id, editDateValue)} className="p-2 bg-emerald-600 text-white rounded-lg"><CheckCircle2 size={12} /></button>
                                   <button onClick={() => setEditingPassId(null)} className="p-2 bg-white/10 text-gray-400 rounded-lg"><XCircle size={12} /></button>
                                 </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingPassId(pass.id);
                                  setEditDateValue(pass.valid_date || '');
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl border transition-all ${
                                  pass.valid_date 
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {pass.valid_date ? <Calendar size={12} /> : <Crown size={12} />}
                                <span className="text-[9px] font-black uppercase tracking-widest truncate">
                                  {pass.valid_date ? `Day: ${new Date(pass.valid_date).toLocaleDateString()}` : 'FULL ACCESS'}
                                </span>
                              </button>
                            )}
                          </div>

                          <button
                             onClick={() => {
                                const current = perPassNameVisibility[pass.id] !== undefined ? perPassNameVisibility[pass.id] : includeName;
                                setPerPassNameVisibility(prev => ({ ...prev, [pass.id]: !current }));
                             }}
                             className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl transition-all text-[9px] font-black uppercase tracking-widest border ${
                                (perPassNameVisibility[pass.id] !== undefined ? perPassNameVisibility[pass.id] : includeName)
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                  : 'bg-white/5 text-gray-600 border-white/10'
                             }`}
                          >
                            <Eye size={12} className={(perPassNameVisibility[pass.id] !== undefined ? perPassNameVisibility[pass.id] : includeName) ? 'text-indigo-400' : 'text-gray-600'} />
                            ID: {(perPassNameVisibility[pass.id] !== undefined ? perPassNameVisibility[pass.id] : includeName) ? 'ON' : 'OFF'}
                          </button>
                        </div>

                        {/* Day Usage */}
                        {(securitySettings?.event_dates || []).length > 0 && (
                          <div className="flex flex-wrap gap-2 p-3 bg-black/20 rounded-2xl border border-white/5">
                            {(securitySettings?.event_dates || []).map((date, idx) => {
                                const dayNum = idx + 1;
                                const isUsed = passUsage[pass.id]?.includes(dayNum);
                                return (
                                  <button key={idx} 
                                     disabled={!isUsed}
                                     onClick={() => isUsed && date && handleResetDay(pass.id, date, dayNum)}
                                     className={`min-w-[40px] px-2 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${
                                      isUsed 
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30' 
                                      : 'bg-white/5 text-gray-600 border-transparent opacity-40'
                                   }`}
                                  >
                                    D{dayNum} {isUsed && <CheckCircle2 size={10} />}
                                  </button>
                                );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-white/5">
                        <button
                          onClick={() => setSelectedPass(pass)}
                          className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-indigo-500/20 active:scale-95 group/btn"
                        >
                          <Download size={14} className="group-hover/btn:-translate-y-0.5 transition-transform" /> DEPLOY QR
                        </button>
                        <button
                          onClick={() => handleToggleCouncilVisibility(pass.id, pass.is_hidden_from_council || false)}
                          className={`p-3 rounded-2xl transition-all border ${
                            pass.is_hidden_from_council 
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                              : 'bg-white/5 text-gray-500 border-white/10 hover:border-white/20'
                          }`}
                          title={pass.is_hidden_from_council ? "Make Visible to Council" : "Hide from Council"}
                        >
                          {pass.is_hidden_from_council ? <Lock size={16} /> : <Eye size={16} className="opacity-40" />}
                        </button>
                        <button
                          onClick={() => handleResetPass(pass.id)}
                          className="p-3 bg-white/5 hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 rounded-2xl transition-all border border-white/10 hover:border-blue-500/20"
                          title="Reset All History"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          onClick={() => handleDownloadImage(pass)}
                          className="p-3 bg-white/5 hover:bg-indigo-500/10 text-gray-500 hover:text-indigo-400 rounded-2xl transition-all border border-white/10 hover:border-indigo-500/20"
                          title="Download PNG"
                        >
                          <ImageIcon size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteVIPPass(pass.id, pass.participant_name)}
                          className="p-3 bg-white/5 hover:bg-rose-500/10 text-gray-500 hover:text-rose-500 rounded-2xl transition-all border border-white/10 hover:border-rose-500/20"
                          title="Purge Node"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight uppercase">System Calibration</h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest opacity-60">Global Parameters & Access Control</p>
          </div>

          <div className="grid gap-6">
            <div className="superia-glass-card p-8 rounded-3xl border-white/10 shadow-xl space-y-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />
               
               <div className="space-y-4 relative z-10">
                 <h4 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-3">
                   <Shield className="text-indigo-400" size={18} />
                   Frontend Access Protocol
                 </h4>
                 <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10 shadow-inner group hover:bg-white/10 transition-all">
                   <div className="flex-1">
                     <h5 className="text-white font-bold text-lg tracking-tight">Public Registration Node</h5>
                     <p className="text-gray-400 text-xs font-medium leading-relaxed opacity-80 mt-1 max-w-md">
                       Toggle visibility of the "Register for Entry Pass" interface on the primary terminal.
                     </p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer ml-8">
                     <input
                       type="checkbox"
                       checked={securitySettings?.entry_pass_button_enabled ?? true}
                       onChange={(e) => updateSecuritySettings({ entry_pass_button_enabled: e.target.checked })}
                       disabled={loading}
                       className="sr-only peer"
                     />
                     <div className="w-16 h-8 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-gray-400 after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white shadow-inner"></div>
                   </label>
                 </div>
               </div>

               <div className="space-y-4 relative z-10 pt-8 border-t border-white/5">
                 <h4 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-3">
                   <Calendar className="text-teal-400" size={18} />
                   Temporal Parameters
                 </h4>
                 <div className="p-6 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                   <p className="text-gray-400 text-xs font-medium leading-relaxed opacity-80 mb-6 font-mono">
                     OPERATIONAL DATES: Passes are valid for single-entry protocols on the following galactic cycles.
                   </p>
                   <div className="flex flex-wrap gap-3">
                     {(securitySettings?.event_dates || []).map((date, idx) => (
                       <div key={idx} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10 shadow-sm group hover:border-indigo-500/30 transition-all">
                         <span className="text-indigo-400 font-black text-[10px] uppercase tracking-widest opacity-60">ID-{idx+1}</span>
                         <span className="text-white font-mono text-xs font-bold">{date}</span>
                         <button
                           onClick={async () => {
                             const next = (securitySettings?.event_dates || []).filter((_, i) => i !== idx);
                             await updateSecuritySettings({ event_dates: next });
                           }}
                           className="text-gray-600 hover:text-red-400 transition-all"
                         >
                           <Trash size={14} />
                         </button>
                       </div>
                     ))}
                     <button
                        onClick={async () => {
                           const d = prompt("Enter date (YYYY-MM-DD):");
                           if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
                              const next = [...(securitySettings?.event_dates || []), d].sort();
                              await updateSecuritySettings({ event_dates: next });
                           }
                        }}
                        className="flex items-center gap-2 px-5 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600/30 transition-all shadow-sm"
                     >
                       <Plus size={14} />
                       Add Cycle
                     </button>
                   </div>
                 </div>
               </div>

               <div className="space-y-4 relative z-10 pt-8 border-t border-white/5">
                 <h4 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-3">
                   <Lock className="text-amber-400" size={18} />
                   Security Overrides
                 </h4>
                 <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                      <h5 className="text-white font-bold text-sm tracking-tight mb-2">Council Access Key</h5>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={councilPassword}
                          onChange={(e) => setCouncilPassword(e.target.value)}
                          placeholder="••••••••"
                          className="flex-1 bg-black/40 text-white text-sm px-4 py-2 rounded-xl border border-white/10 focus:border-indigo-500 outline-none transition-all shadow-inner"
                        />
                        <button
                          onClick={updateCouncilPassword}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                        >
                          Sync
                        </button>
                      </div>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Council Access Tab */}
      {activeTab === 'council' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight uppercase">Council Authority</h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest opacity-60">Dashboard Credentials & Access Keys</p>
          </div>

          <div className="superia-glass-card p-10 rounded-3xl border-white/10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />
             
             <div className="max-w-2xl space-y-6 relative z-10">
               <div className="flex items-start gap-5">
                 <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                   <Lock size={24} />
                 </div>
                 <div className="space-y-1">
                   <h4 className="text-white font-black text-lg tracking-tight">Main Terminal Password</h4>
                   <p className="text-gray-400 text-xs font-medium leading-relaxed opacity-80">
                     This key authorizes Student Council members to access their dedicated management terminal.
                     Update this if rotation protocols require fresh credentials.
                   </p>
                 </div>
               </div>

               <div className="pt-4 flex flex-col sm:flex-row gap-4">
                 <div className="flex-1 relative">
                    <input 
                      type="password" 
                      value={councilPassword}
                      onChange={e => setCouncilPassword(e.target.value)}
                      placeholder="ENTER NEW PROTOCOL KEY"
                      className="w-full bg-black/40 text-white text-sm font-mono tracking-widest px-6 py-4 rounded-2xl border border-white/10 focus:border-purple-500 outline-none transition-all shadow-inner placeholder:text-gray-700 placeholder:text-[10px]"
                    />
                 </div>
                 <button 
                   onClick={updateCouncilPassword}
                   disabled={loading}
                   className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl hover:shadow-purple-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                 >
                   {loading ? (
                     <RefreshCw size={16} className="animate-spin" />
                   ) : (
                     <CheckCircle2 size={16} />
                   )}
                   Synchronize Key
                 </button>
               </div>
               
               <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center gap-3">
                 <AlertTriangle className="text-amber-500/60" size={16} />
                 <p className="text-[10px] text-amber-500/60 font-bold uppercase tracking-widest">
                   Changing this key will terminate current active sessions on the Council Terminal.
                 </p>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase">Validation Protocols</h3>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest opacity-60">Security Firewall Configuration</p>
            </div>
            <div className="flex gap-2">
               <button
                 onClick={() => handleCreateRule('date_restriction')}
                 className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all active:scale-95"
               >
                 <Plus size={14} className="text-indigo-400" />
                 Temporal Gate
               </button>
               <button
                 onClick={() => handleCreateRule('capacity')}
                 className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all active:scale-95"
               >
                 <Plus size={14} className="text-teal-400" />
                 Capacity Cap
               </button>
            </div>
          </div>

          {!rulesTableReady && (
            <div className="superia-glass-card p-6 rounded-2xl border-amber-500/20 bg-amber-500/5 flex items-start gap-4">
              <AlertTriangle className="text-amber-500 mt-1" size={20} />
              <div>
                <p className="text-amber-500 font-black text-sm uppercase tracking-widest">Database Sync Error</p>
                <p className="text-amber-500/60 text-xs font-medium mt-1">
                  The security firewall table is offline. Default protocols are active.
                  <button onClick={() => loadData()} className="ml-2 underline font-black hover:text-amber-400 transition-colors">Retry Sync</button>
                </p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {validationRules.map((rule) => (
              <div key={rule.id} className={`superia-glass-card p-6 rounded-3xl border-white/10 shadow-xl transition-all group relative overflow-hidden ${
                !rule.is_active ? 'opacity-50 grayscale' : ''
              }`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2" />
                
                <div className="flex items-start justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl border ${
                      rule.rule_type === 'date_restriction' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 
                      rule.rule_type === 'capacity' ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' : 
                      'bg-white/5 border-white/10 text-gray-500'
                    }`}>
                      {rule.rule_type === 'date_restriction' ? <Calendar size={20} /> : 
                       rule.rule_type === 'capacity' ? <Users size={20} /> : <Lock size={20} />}
                    </div>
                    <div>
                      <h4 className="text-white font-black text-lg tracking-tight">{rule.rule_name}</h4>
                      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest opacity-60 leading-none mt-1">
                        {rule.rule_type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.is_active}
                      onChange={() => handleToggleRule(rule)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-white/5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-gray-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                  </label>
                </div>

                <div className="space-y-4 relative z-10">
                  {rule.rule_type === 'date_restriction' && (
                     <div className="pt-4 border-t border-white/5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Permitted Cycles (IST)</label>
                        <div className="flex flex-wrap gap-2">
                           {(securitySettings?.event_dates || []).map((date) => {
                              const isAllowed = rule.config.allowedDates?.includes(date);
                              return (
                                 <button
                                    key={date}
                                    onClick={() => {
                                       const current = rule.config.allowedDates || [];
                                       const next = current.includes(date) ? current.filter(d => d !== date) : [...current, date];
                                       handleRuleConfigUpdate(rule.id, { ...rule.config, allowedDates: next });
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                       isAllowed 
                                       ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' 
                                       : 'bg-white/5 text-gray-600 border-white/5 hover:border-white/20'
                                    }`}
                                 >
                                    {date}
                                 </button>
                              );
                           })}
                        </div>
                     </div>
                  )}

                  {rule.rule_type === 'capacity' && (
                     <div className="pt-4 border-t border-white/5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Max Capacity Per Cycle</label>
                        <input
                           type="number"
                           value={rule.config.maxCapacity || ''}
                           onChange={(e) => handleRuleConfigUpdate(rule.id, { ...rule.config, maxCapacity: parseInt(e.target.value) || 0 })}
                           className="w-full bg-black/40 text-white text-sm px-4 py-2 rounded-xl border border-white/10 focus:border-indigo-500 outline-none transition-all shadow-inner"
                           placeholder="Enter threshold..."
                        />
                     </div>
                  )}
                  
                  {rule.rule_type === 'time_window' && (
                     <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Start Time</label>
                           <input
                             type="time"
                             value={rule.config.startTime || ''}
                             onChange={(e) => handleRuleConfigUpdate(rule.id, { ...rule.config, startTime: e.target.value })}
                             className="w-full bg-black/40 text-white text-xs px-3 py-2 rounded-xl border border-white/10 focus:border-indigo-500 outline-none transition-all"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">End Time</label>
                           <input
                             type="time"
                             value={rule.config.endTime || ''}
                             onChange={(e) => handleRuleConfigUpdate(rule.id, { ...rule.config, endTime: e.target.value })}
                             className="w-full bg-black/40 text-white text-xs px-3 py-2 rounded-xl border border-white/10 focus:border-indigo-500 outline-none transition-all"
                           />
                        </div>
                     </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end relative z-10">
                   <button
                     onClick={() => handleDeleteRule(rule.id)}
                     className="p-2 text-gray-500 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                   >
                     <Trash size={16} />
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'design' && (
        <PassTemplateDesigner />
      )}

      {/* QR Modal */}
      {selectedPass && createPortal(
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
          <div className="superia-glass-card p-10 rounded-[3rem] max-w-md w-full border-white/10 shadow-[0_0_100px_rgba(99,102,241,0.2)] text-center relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
             <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-1 w-24 bg-indigo-500 rounded-full mb-8 opacity-20" />
                <h3 className="text-xl font-black text-white mb-8 tracking-tight uppercase">Protocol Authorization</h3>
                
                <div className="p-6 bg-white rounded-[2rem] shadow-2xl mb-8 relative">
                   <div className="absolute -inset-4 bg-indigo-500/20 rounded-[3rem] blur-2xl -z-10" />
                   <QRCodeGenerator
                     passToken={selectedPass.pass_token}
                     participantName={selectedPass.participant_name}
                     passType={selectedPass.pass_type}
                     size={240}
                   />
                </div>

                <div className="space-y-2 mb-10 w-full">
                   <p className="text-white font-black text-lg tracking-tight">{selectedPass.participant_name || 'VIP Guest'}</p>
                   <p className="text-indigo-400 font-mono text-xs font-bold tracking-widest">{selectedPass.pass_token}</p>
                   <div className="pt-2">
                     <span className="px-4 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest">
                       {selectedPass.pass_type.toUpperCase()} PASS
                     </span>
                   </div>
                </div>

                <button
                  onClick={() => setSelectedPass(null)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all border border-white/10 active:scale-95"
                >
                  Return to Control
                </button>
             </div>
          </div>
        </div>
      , document.body)}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase">Audit Logs</h3>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest opacity-60">Complete Scan History Matrix</p>
            </div>
            <button
              onClick={() => loadData()}
              className="p-3 bg-white/5 hover:bg-white/10 text-indigo-400 rounded-2xl border border-white/10 transition-all shadow-lg active:scale-95"
              title="Refresh Stream"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="superia-glass-card rounded-[2.5rem] border-white/10 shadow-2xl overflow-hidden bg-white/[0.02]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Temporal Stamp</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Identity</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Protocol</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Result</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {scanHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <History size={40} className="mx-auto text-gray-600 mb-4 opacity-20" />
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No scan events recorded in the current cycle</p>
                      </td>
                    </tr>
                  ) : (
                    scanHistory.map((scan) => (
                      <tr key={scan.id} className="hover:bg-white/[0.03] transition-colors group">
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className="text-gray-400 font-mono text-xs">{new Date(scan.scanned_at).toLocaleString()}</span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <p className="text-white font-black text-sm tracking-tight">{scan.participant_name || 'Anonymous Guest'}</p>
                          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-tighter mt-0.5">{scan.pass_token}</p>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            scan.pass_type === 'vip' 
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)]' 
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {scan.pass_type?.toUpperCase() || 'REGULAR'}
                          </span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                            scan.scan_result === 'valid' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                              : scan.scan_result === 'already_used'
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {scan.scan_result === 'already_used' ? 'DUPLICATE' : scan.scan_result.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                            <span className="text-indigo-300 font-black text-[10px] uppercase tracking-widest opacity-80">
                              {scan.guard_name || scan.scanned_by_username || 'System Admin'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
