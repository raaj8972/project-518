import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Shield, Crown, Eye, EyeOff, Trash, Plus, Clock, CheckCircle2, FileUp, Download, RefreshCw, Lock, Calendar, AlertTriangle, UserPlus, CheckSquare, Square, XCircle } from 'lucide-react';
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

  // Derive current day number (IST)
  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const currentDayIdx = (securitySettings?.event_dates || []).indexOf(todayIST);
  const currentDayNum = currentDayIdx !== -1 ? currentDayIdx + 1 : null;

  const toggleSelectAll = () => {
    if (selectedVipIds.size === vipPasses.length) {
      setSelectedVipIds(new Set());
    } else {
      setSelectedVipIds(new Set(vipPasses.map(p => p.id)));
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
    if (!councilPassword.trim()) return toast.error('Enter a password');
    setLoading(true);
    try {
      const { error } = await supabase.rpc('set_council_password', { p_password: councilPassword });
      if (error) throw error;
      toast.success('Council password updated');
      setCouncilPassword('');
    } catch (err: any) {
       toast.error(err.message || 'Failed to update');
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
    const { data } = await supabase.from('pass_scans')
       .select('pass_id, scanned_at')
       .in('pass_id', ids)
       .eq('scan_result', 'valid');
    
    if (data) {
       const usage: Record<string, number[]> = {};
       data.forEach(scan => {
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
       toast.success(!currentHidden ? 'Pass hidden from Council' : 'Pass visible to Council');
    } catch (err: any) {
       console.error(err);
       toast.error('Failed to update visibility');
    }
  };

  const handleResetPass = async (passId: string) => {
    if (!window.confirm('Reset this pass? This will clear all entry history and allow it to be used again as new.')) return;
    try {
      const { error } = await supabase.rpc('reset_pass_usage', { p_pass_id: passId });
      if (error) throw error;
      toast.success('Pass usage reset');
      loadData(); // Refresh list
    } catch (err) {
      console.error(err);
      toast.error('Failed to reset pass');
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
      toast.success(`Day ${dayNum} entry removed`);
      await loadData(); // Reload pass status and trigger fetchPassUsage via effect
    } catch (err) {
      console.error(err);
      toast.error('Failed to update scan');
    }
  };

  const updateEntryPassButtonSetting = async (enabled: boolean) => {
    try {
      setLoading(true);
      await updateSecuritySettings({ entry_pass_button_enabled: enabled });
      toast.success(`Entry pass button ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      console.error('Error updating settings:', err);
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };
  const loadData = async () => {
    if (activeTab === 'users') {
      const { data: users } = await supabase.from('security_users').select('*').order('created_at', { ascending: false });
      if (users) setSecurityUsers(users);
    } else if (activeTab === 'passes') {
      const { data: passes } = await supabase.from('pass_registrations').select('*').order('created_at', { ascending: false });
      if (passes) setPassRegistrations(passes);
    } else if (activeTab === 'vip') {
      const { data: vip } = await supabase
        .from('entry_passes')
        .select('*')
        .eq('pass_type', 'vip')
        .order('created_at', { ascending: false });
      if (vip) setVipPasses(vip);
    } else if (activeTab === 'rules') {
      try {
        const { data, error } = await supabase
          .from('validation_rules')
          .select('*')
          .order('priority', { ascending: false });
        
        if (error) {
          if (error.code === '42P01') { // undefined_table
            setRulesTableReady(false);
            setValidationRules(DEFAULT_RULES);
            setRuleLoadError('Table "validation_rules" not found (42P01)');
          } else {
            setRuleLoadError(`${error.message} (Code: ${error.code})`);
            throw error;
          }
        } else if (data && data.length > 0) {
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
        if (!ruleLoadError) setRuleLoadError(err.message || 'Unknown failed to load');
      }
    } else if (activeTab === 'history') {
      const { data: history } = await supabase
        .from('pass_scans')
        .select('*')
        .order('scanned_at', { ascending: false })
        .limit(200);
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
    if (!rulesTableReady) return toast.error('Database table not ready');
    
    // Optimistic update
    const updated = { ...rule, is_active: !rule.is_active };
    setValidationRules(prev => prev.map(r => r.id === rule.id ? updated : r));
    
    try {
      const { error } = await supabase
        .from('validation_rules')
        .upsert(updated)
        .select();
        
      if (error) throw error;
      toast.success(`Rule ${updated.is_active ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save rule');
      loadData(); // Revert
    }
  };

  const handleRuleConfigUpdate = async (ruleId: string, newConfig: any) => {
    if (!rulesTableReady) return toast.error('Database table not ready');
    
    try {
      setLoading(true);
      const rule = validationRules.find(r => r.id === ruleId);
      if (!rule) return;
      
      const updated = { ...rule, config: newConfig };
      
      const { error } = await supabase
        .from('validation_rules')
        .upsert(updated);
        
      if (error) throw error;
      
      setValidationRules(prev => prev.map(r => r.id === ruleId ? updated : r));
      toast.success('Rule configuration updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update config');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (type: 'date_restriction' | 'time_window' | 'capacity') => {
    if (!rulesTableReady) return toast.error('Database not ready');
    
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

      const { data, error } = await supabase
        .from('validation_rules')
        .insert(newRule)
        .select()
        .single();

      if (error) throw error;
      
      setValidationRules(prev => [data as ValidationRule, ...prev]);
      toast.success('Rule created');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create rule');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!rulesTableReady) return toast.error('Database not ready');
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      setLoading(true);
      const { error } = await supabase.from('validation_rules').delete().eq('id', id);
      if (error) throw error;
      
      setValidationRules(prev => prev.filter(r => r.id !== id));
      toast.success('Rule deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete rule');
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

      toast.success('Security user created successfully');
      setNewUser({ username: '', password: '', full_name: '' });
      setShowCreateUser(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSecurityUser = async (id: number, username: string) => {
    if (!window.confirm(`Are you sure you want to delete the security user "@${username}"?`)) return;
    try {
      const { error } = await supabase.rpc('delete_security_user', { p_user_id: id });
      if (error) throw error;
      toast.success('Security user deleted');
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete user');
    }
  };

  const handleApprovePass = async (passRegId: string) => {
    setLoading(true);

    try {
      const { error } = await supabase.rpc('approve_pass_registration', {
        p_pass_reg_id: passRegId,
      });

      if (error) throw error;

      toast.success('Pass approved and generated');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve pass');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPass = async (passRegId: string) => {
    const reason = prompt('Rejection reason (optional):');
    
    try {
      const { error } = await supabase
        .from('pass_registrations')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', passRegId);

      if (error) throw error;

      toast.success('Pass registration rejected');
      loadData();
    } catch (error: any) {
      toast.error('Failed to reject pass');
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

      toast.success('VIP pass created successfully');
      setNewVIP({ name: '', notes: '', validDate: '' });
      setShowCreateVIP(false);
      loadData(); // Refresh the VIP passes list
    } catch (error: any) {
      toast.error(error.message || 'Failed to create VIP pass');
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
          toast.error('File is empty');
          return;
        }

        // Validate structure (expecting 'name' or 'Notes')
        const firstRow = data[0] as any;
        const nameKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'name' || k.toLowerCase() === 'participant_name');
        
        if (!nameKey) {
          toast.error('File must have a "name" column');
          return;
        }

        setImportData(data);
        toast.success(`Loaded ${data.length} records. Click "Process" to create passes.`);
      } catch (err) {
        toast.error('Failed to parse file');
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

    const toastId = toast.loading(`Processing ${importData.length} VIP passes...`);

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
          toast.loading(`Processing: ${successCount}/${importData.length} done...`, { id: toastId });
        }
      }

      if (failCount > 0) {
        toast.success(`Batch complete: ${successCount} created, ${failCount} failed`, { id: toastId });
      } else {
        toast.success(`Successfully created ${successCount} VIP passes!`, { id: toastId });
      }
      
      setImportData([]);
      setShowBulkVIP(false);
      loadData();
    } catch (err) {
      toast.error('Bulk processing failed', { id: toastId });
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleDownloadPDF = async (passOrPasses: VipPass | VipPass[], specificDay?: number) => {
    const config = securitySettings?.pass_template_config || {};
    const eventDates = securitySettings?.event_dates || [];
    
    // Fallback: If no designs exist at all, we can't do anything
    if (Object.keys(config).length === 0) {
      toast.error('Please configure a pass design in the "Pass Design" tab first.');
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
    const toastId = toast.loading('Generating PDF...');

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
          toast.loading(`Generating PDF: ${pct}%`, { id: toastId });
        },
        includeName // Global default if pass specific is undefined
      });
      toast.success('PDF downloaded!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF', { id: toastId });
    }
  };

  const handleDownloadA4PDF = async (passOrPasses: VipPass | VipPass[], _specificDay?: number) => {
    const config = securitySettings?.pass_template_config || {};
    const eventDates = securitySettings?.event_dates || [];
    
    if (Object.keys(config).length === 0) {
      toast.error('Configure pass design first');
      return;
    }

    const passes = Array.isArray(passOrPasses) ? passOrPasses : [passOrPasses];
    const toastId = toast.loading('Generating A4 Sheet...');

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
        templateConfigs: securitySettings?.pass_template_config || {},
        selectedDays: (securitySettings?.event_dates || []).map((_, i) => i),
        eventDates,
        onProgress: (pct) => {
          toast.loading(`Generating A4: ${pct}%`, { id: toastId });
        },
        includeName
      });
      toast.success('A4 Sheet downloaded!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate A4 PDF', { id: toastId });
    }
  };

  const handleDownloadImage = async (passOrPasses: VipPass | VipPass[], format: 'png' | 'jpg' = 'png', specificDay?: number) => {
    const config = securitySettings?.pass_template_config || {};
    const eventDates = securitySettings?.event_dates || [];
    
    if (Object.keys(config).length === 0) {
      toast.error('Please configure a pass design in the "Pass Design" tab first.');
      setActiveTab('design');
      return;
    }

    const passes = Array.isArray(passOrPasses) ? passOrPasses : [passOrPasses];
    const toastId = toast.loading(`Generating ${format.toUpperCase()}...`);

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
          toast.loading(`Generating ${format.toUpperCase()}: ${pct}%`, { id: toastId });
        },
        includeName,
      });
      toast.success(`${format.toUpperCase()} downloaded!`, { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate images', { id: toastId });
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
      toast.success('Registration deleted');
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete registration');
    }
  };

  const handleDeleteVIPPass = async (id: string, name: string | null) => {
    const displayName = name || 'Unnamed VIP';
    if (!window.confirm(`Are you sure you want to delete the VIP pass for "${displayName}"? All scan records will be lost.`)) return;
    try {
      const { error } = await supabase.rpc('delete_entry_pass_v3', { p_pass_id: id });
      if (error) throw error;
      toast.success('VIP pass deleted');
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete pass');
    }
  };

  const handleUpdatePassDate = async (passId: string, newDate: string) => {
    try {
      const { error } = await supabase.rpc('update_pass_date', {
        p_pass_id: passId,
        p_new_date: newDate || null, // Allow clearing the date
      });

      if (error) throw error;

      toast.success(newDate ? 'Pass date updated' : 'Pass is now valid for ALL days');
      setEditingPassId(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update date');
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
      toast.error('Pass not generated yet');
    }
  };

  return (
    <div className="space-y-6 bg-gray-900 text-white p-6 rounded-xl shadow-2xl border border-gray-800">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-cyan-500" />
          Security Management
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'users'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Security Users
        </button>
        <button
          onClick={() => setActiveTab('passes')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'passes'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Pass Registrations
        </button>
        <button
          onClick={() => setActiveTab('vip')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'vip'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          VIP Passes
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'settings'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          >
          Settings
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'rules'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          >
          Rules
        </button>  
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'history'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          >
          Scan History
        </button>  
        <button
          onClick={() => setActiveTab('council')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'council'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          >
          Council Access
        </button>
        <button
          onClick={() => setActiveTab('design')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'design'
              ? 'text-pink-400 border-b-2 border-pink-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Pass Design
        </button>
      </div>

      {/* Security Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowCreateUser(!showCreateUser)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Create Security User
          </button>

          {showCreateUser && (
            <form onSubmit={handleCreateSecurityUser} className="bg-gray-800/50 p-6 rounded-lg space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {securityUsers.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No security users created yet</p>
          ) : (
            <div className="space-y-2">
              {securityUsers.map((user) => (
              <div key={user.id} className="bg-gray-800/50 p-4 rounded-lg flex items-center justify-between border border-gray-700/50">
                <div>
                  <p className="text-white font-semibold text-lg">{user.full_name}</p>
                  <p className="text-cyan-400 text-sm">@{user.username}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs ${
                  user.is_active
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => handleDeleteSecurityUser(user.id, user.username)}
                  className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete User"
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
        <div className="space-y-4">
          {passRegistrations.filter(p => p.status === 'pending').length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 font-semibold">
                {passRegistrations.filter(p => p.status === 'pending').length} pending approvals
              </p>
            </div>
          )}

          {passRegistrations.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No pass registrations yet</p>
          ) : (
            <div className="space-y-2">
              {passRegistrations.map((reg) => (
              <div key={reg.id} className="bg-gray-800/30 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-semibold">{reg.full_name}</p>
                    <p className="text-gray-400 text-sm">{reg.email} • {reg.phone}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(reg.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    reg.status === 'approved'
                      ? 'bg-green-500/20 text-green-400'
                      : reg.status === 'rejected'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {reg.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex gap-2 mt-3">
                  {reg.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprovePass(reg.id)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectPass(reg.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {reg.status === 'approved' && (
                    <button
                      onClick={() => viewPassQR(reg.id)}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      View QR
                  </button>
                  )}
                  <button
                    onClick={() => handleDeletePassRegistration(reg.id, reg.full_name)}
                    className="px-3 py-1 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-sm rounded flex items-center gap-1 transition-colors border border-red-500/20"
                    title="Permanent Delete"
                  >
                    <Trash className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIP Passes Tab */}
        {activeTab === 'vip' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Crown className="w-6 h-6 text-yellow-500" />
                VIP Access Management
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowCreateVIP(!showCreateVIP)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create VIP Pass
                </button>
                <button
                  onClick={() => setShowBulkVIP(!showBulkVIP)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors border border-gray-600"
                >
                  <FileUp className="w-4 h-4" />
                  Bulk Import
                </button>
                {Object.keys(securitySettings?.pass_template_config || {}).length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
                      selectedVipIds.size === vipPasses.length && vipPasses.length > 0
                        ? 'bg-purple-600/20 text-purple-400 border-purple-500/30'
                        : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:text-gray-300'
                    }`}
                  >
                    {selectedVipIds.size === vipPasses.length && vipPasses.length > 0 ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {selectedVipIds.size === vipPasses.length && vipPasses.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 items-end">
               {/* Name Toggle */}
               <label className="flex items-center gap-2 cursor-pointer bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={includeName} 
                    onChange={(e) => setIncludeName(e.target.checked)} 
                    className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900" 
                  />
                  <span className="text-sm font-medium text-gray-300 select-none">Include Name on Pass</span>
               </label>

              {/* PDF Row */}
              <div className="flex flex-wrap gap-2 items-center justify-end">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">PDF:</span>
                  {(securitySettings?.event_dates || []).length > 1 ? (
                    <div className="flex flex-wrap gap-1 w-full sm:w-auto">
                      {(securitySettings?.event_dates || []).map((_, idx) => {
                        const dayNum = idx + 1;
                        const targetPasses = selectedVipIds.size > 0 
                          ? vipPasses.filter(p => selectedVipIds.has(p.id)) 
                          : vipPasses;
                        
                        return (
                          <button
                            key={`pdf-${idx}`}
                            onClick={() => handleDownloadPDF(targetPasses, idx)}
                            disabled={vipPasses.length === 0}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg transition-colors border border-blue-500/30 disabled:opacity-50 text-[10px] sm:text-xs font-bold"
                          >
                            <Download className="w-3 h-3" />
                            {selectedVipIds.size > 0 ? `${selectedVipIds.size} (D${dayNum})` : `D${dayNum}`}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => {
                          const targetPasses = selectedVipIds.size > 0 
                            ? vipPasses.filter(p => selectedVipIds.has(p.id)) 
                            : vipPasses;
                          handleDownloadPDF(targetPasses);
                        }}
                        disabled={vipPasses.length === 0}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors border border-indigo-500/30 disabled:opacity-50 text-[10px] sm:text-xs font-bold"
                      >
                        <Download className="w-3 h-3" />
                        {selectedVipIds.size > 0 ? `${selectedVipIds.size} All` : 'All'}
                      </button>
                    </div>
                  ) : (
                    <button
                       onClick={() => {
                         const targetPasses = selectedVipIds.size > 0 
                           ? vipPasses.filter(p => selectedVipIds.has(p.id)) 
                           : vipPasses;
                         handleDownloadPDF(targetPasses);
                       }}
                       disabled={vipPasses.length === 0}
                       className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors border border-blue-500/30 disabled:opacity-50 text-xs font-bold"
                    >
                      <Download className="w-3 h-3" />
                      {selectedVipIds.size > 0 ? `Download PDF (${selectedVipIds.size})` : 'Download PDF'}
                    </button>
                  )}
              </div>

              {/* PNG Row */}
              <div className="flex flex-wrap gap-2 items-center justify-end">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">PNG:</span>
                  {(securitySettings?.event_dates || []).length > 1 ? (
                    <div className="flex flex-wrap gap-1 w-full sm:w-auto">
                      {(securitySettings?.event_dates || []).map((_, idx) => {
                        const dayNum = idx + 1;
                        const targetPasses = selectedVipIds.size > 0 
                          ? vipPasses.filter(p => selectedVipIds.has(p.id)) 
                          : vipPasses;
                        
                        return (
                          <button
                            key={`png-${idx}`}
                            onClick={() => handleDownloadImage(targetPasses, 'png', idx)}
                            disabled={vipPasses.length === 0}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-teal-600/10 hover:bg-teal-600/20 text-teal-400 rounded-lg transition-colors border border-teal-500/30 disabled:opacity-50 text-[10px] sm:text-xs font-bold"
                          >
                            <Download className="w-3 h-3" />
                            {selectedVipIds.size > 0 ? `${selectedVipIds.size} (D${dayNum})` : `D${dayNum}`}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => {
                          const targetPasses = selectedVipIds.size > 0 
                            ? vipPasses.filter(p => selectedVipIds.has(p.id)) 
                            : vipPasses;
                          handleDownloadImage(targetPasses, 'png');
                        }}
                        disabled={vipPasses.length === 0}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors border border-teal-500/30 disabled:opacity-50 text-[10px] sm:text-xs font-bold"
                      >
                        <Download className="w-3 h-3" />
                        {selectedVipIds.size > 0 ? `${selectedVipIds.size} All` : 'All'}
                      </button>
                    </div>
                  ) : (
                    <button
                       onClick={() => {
                         const targetPasses = selectedVipIds.size > 0 
                           ? vipPasses.filter(p => selectedVipIds.has(p.id)) 
                           : vipPasses;
                         handleDownloadImage(targetPasses, 'png');
                       }}
                       disabled={vipPasses.length === 0}
                       className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors border border-teal-500/30 disabled:opacity-50 text-xs font-bold"
                    >
                      <Download className="w-3 h-3" />
                      {selectedVipIds.size > 0 ? `Download PNG (${selectedVipIds.size})` : 'Download PNG'}
                    </button>
                  )}
              </div>

              {/* A4 Sheet Row */}
              <div className="flex flex-wrap gap-2 items-center justify-end">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Sheet:</span>
                  <button
                     onClick={() => {
                       const targetPasses = selectedVipIds.size > 0 
                         ? vipPasses.filter(p => selectedVipIds.has(p.id)) 
                         : vipPasses;
                       handleDownloadA4PDF(targetPasses);
                     }}
                     disabled={vipPasses.length === 0}
                     className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors border border-purple-500/30 disabled:opacity-50 text-xs font-bold"
                  >
                    <FileUp className="w-3 h-3" />
                    {selectedVipIds.size > 0 ? `Download A4 Sheet (${selectedVipIds.size})` : 'Download A4 Sheet'}
                  </button>
              </div>
            </div>

          {showBulkVIP && (
            <div className="bg-indigo-950/20 border border-indigo-500/30 p-6 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-indigo-400">Bulk VIP Import</h3>
                  <p className="text-sm text-gray-400">Upload a CSV or Excel file with a "name" column.</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Download Template
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                />
                
                {importData.length > 0 && (
                  <button
                    onClick={handleProcessBulk}
                    disabled={processingBulk}
                    className="w-full sm:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                  >
                    {processingBulk ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {processingBulk ? 'Creating...' : `Process ${importData.length} Records`}
                  </button>
                )}
              </div>
            </div>
          )}

          {showCreateVIP && (
            <form onSubmit={handleCreateVIP} className="bg-gray-800/50 p-6 rounded-lg space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">VIP Name (Optional)</label>
                <input
                  type="text"
                  value={newVIP.name}
                  onChange={(e) => setNewVIP({ ...newVIP, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Leave blank for unnamed VIP pass"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Notes (Optional)</label>
                <textarea
                  value={newVIP.notes}
                  onChange={(e) => setNewVIP({ ...newVIP, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows={3}
                  placeholder="Internal notes about this VIP pass"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Valid Date (Optional)</label>
                <div className="flex flex-col gap-1">
                  <input
                    type="date"
                    value={newVIP.validDate}
                    onChange={(e) => setNewVIP({ ...newVIP, validDate: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                  <span className="text-xs text-gray-500">
                    Leave blank for ALL-DAY access. Select a date to restrict pass to that day only.
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  {loading ? 'Creating...' : 'Create VIP Pass'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateVIP(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {vipPasses.length === 0 ? (
              <p className="text-gray-400 text-sm">No VIP passes created yet</p>
            ) : (
              vipPasses.map((pass) => (
                <div key={pass.id} className={`bg-gray-800/30 p-4 rounded-lg border transition-all ${
                  selectedVipIds.has(pass.id) ? 'border-purple-500/50 bg-purple-500/5' : 'border-transparent'
                }`}>
                  <div className="flex items-start gap-4 mb-2">
                    <button 
                      onClick={() => toggleSelectVip(pass.id)}
                      className={`mt-1.5 transition-colors p-1 -m-1 ${
                        selectedVipIds.has(pass.id) ? 'text-purple-400' : 'text-gray-600 hover:text-gray-500'
                      }`}
                    >
                      {selectedVipIds.has(pass.id) ? (
                        <CheckSquare className="w-6 h-6" />
                      ) : (
                        <Square className="w-6 h-6" />
                      )}
                    </button>
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-white font-bold text-lg leading-tight">
                          {pass.participant_name || <span className="text-gray-500 italic">Unnamed VIP</span>}
                        </p>
                        {pass.notes && (
                          <p className="text-gray-400 text-sm">{pass.notes}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(pass.created_at).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Token: {pass.pass_token}
                        </p>
                        {/* Date Validity / Editor */}
                        {editingPassId === pass.id ? (
                          <div className="mt-2 p-2 bg-gray-900 rounded border border-gray-700 flex items-center gap-2">
                             <input 
                               type="date" 
                               value={editDateValue}
                               onChange={e => setEditDateValue(e.target.value)}
                               className="bg-gray-800 text-white text-xs px-2 py-1 rounded border border-gray-600 focus:border-cyan-500 outline-none"
                             />
                             <button
                               onClick={() => handleUpdatePassDate(pass.id, editDateValue)}
                               className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                               title="Save Date"
                             >
                               <CheckCircle2 className="w-4 h-4" />
                             </button>
                             <button
                               onClick={() => setEditingPassId(null)}
                               className="p-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                               title="Cancel"
                             >
                                <XCircle className="w-4 h-4" />
                             </button>
                             <button
                               onClick={() => handleUpdatePassDate(pass.id, '')} // Set to null (All Access)
                               className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-[10px] font-bold px-2"
                               title="Make All-Day Access"
                             >
                               ALL
                             </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {pass.valid_date ? (
                               <p className="text-xs font-bold text-amber-500 mt-1 flex items-center gap-1">
                                 <Clock className="w-3 h-3" />
                                 Valid: {new Date(pass.valid_date).toLocaleDateString()}
                               </p>
                            ) : (
                               <p className="text-xs font-bold text-green-500 mt-1 flex items-center gap-1">
                                 <Crown className="w-3 h-3" />
                                 All-Day Access
                               </p>
                            )}
                            
                            <button
                              onClick={() => {
                                setEditingPassId(pass.id);
                                setEditDateValue(pass.valid_date || '');
                              }}
                              className="text-gray-500 hover:text-cyan-400 p-1 opacity-50 hover:opacity-100 transition-all"
                              title="Edit Valid Date"
                            >
                               <FileUp className="w-3 h-3" />
                            </button>

                            {/* Name Visibility Toggle */}
                            <button
                               onClick={() => {
                                  const current = perPassNameVisibility[pass.id] !== undefined ? perPassNameVisibility[pass.id] : includeName;
                                  setPerPassNameVisibility(prev => ({ ...prev, [pass.id]: !current }));
                               }}
                               className={`p-1 rounded transition-all text-[10px] font-bold border ${
                                  (perPassNameVisibility[pass.id] !== undefined ? perPassNameVisibility[pass.id] : includeName)
                                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                    : 'bg-gray-700 text-gray-500 border-gray-600'
                               }`}
                               title="Toggle Name on Pass"
                            >
                               Aa
                            </button>
                          </div>
                        )}
                        
                        {/* Day Usage Badges */}
                        {(securitySettings?.event_dates || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(securitySettings?.event_dates || []).map((date, idx) => {
                                const dayNum = idx + 1;
                                const isUsed = passUsage[pass.id]?.includes(dayNum);
                                return (
                                  <button key={idx} 
                                     disabled={!isUsed}
                                     onClick={() => isUsed && date && handleResetDay(pass.id, date, dayNum)}
                                     className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 transition-colors ${
                                      isUsed 
                                      ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 cursor-pointer' 
                                      : 'bg-gray-700 text-gray-500 border-gray-600 cursor-default'
                                  }`}
                                  title={isUsed ? "Click to remove this day's entry" : "Not visited"}
                                  >
                                    <span className="opacity-80">Day {dayNum}</span>
                                    {isUsed ? (
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                    ) : (
                                      <Clock className="w-2.5 h-2.5 opacity-40" />
                                    )}
                                  </button>
                                );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest whitespace-nowrap ${
                          (pass.pass_type === 'vip' ? (currentDayNum && passUsage[pass.id]?.includes(currentDayNum)) : pass.is_used)
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : 'bg-green-500/10 text-green-400 border border-green-500/20'
                        }`}>
                          {(pass.pass_type === 'vip' ? (currentDayNum && passUsage[pass.id]?.includes(currentDayNum)) : pass.is_used) ? 'CHECKED IN' : 'VALID'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-700/30">
                    <button
                      onClick={() => setSelectedPass(pass)}
                      className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      View QR
                    </button>
                    
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {(securitySettings?.event_dates || []).length > 1 ? (
                        <div className="flex flex-col gap-1">
                          {/* PDF Row */}
                          <div className="flex items-center gap-1">
                             <span className="text-[9px] text-gray-500 uppercase w-6">PDF</span>
                             {(securitySettings?.event_dates || []).map((_, idx) => {
                            const dayNum = idx + 1;
                            return (
                              <button
                                key={`pdf-${idx}`}
                                onClick={() => handleDownloadPDF(pass, idx)}
                                className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold border border-blue-500/20 transition-colors"
                              >
                                D{dayNum}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => handleDownloadPDF(pass)}
                            className="flex items-center gap-1 px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded text-[10px] font-bold border border-indigo-500/20 transition-colors"
                          >
                            All
                          </button>
                          </div>
                          
                          {/* PNG Row */}
                          <div className="flex items-center gap-1">
                             <span className="text-[9px] text-gray-500 uppercase w-6">PNG</span>
                             {(securitySettings?.event_dates || []).map((_, idx) => {
                            const dayNum = idx + 1;
                            return (
                              <button
                                key={`png-${idx}`}
                                onClick={() => handleDownloadImage(pass, 'png', idx)}
                                className="flex items-center gap-1 px-2 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 rounded text-[10px] font-bold border border-teal-500/20 transition-colors"
                              >
                                D{dayNum}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => handleDownloadImage(pass, 'png')}
                            className="flex items-center gap-1 px-2 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 rounded text-[10px] font-bold border border-teal-500/20 transition-colors"
                          >
                            All
                          </button>
                          </div>
                          
                          {/* A4 Sheet Row */}
                          <div className="flex items-center gap-1 justify-end mt-1">
                             <button
                                onClick={() => handleDownloadA4PDF(pass)}
                                className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded text-[10px] font-bold border border-purple-500/20 transition-colors"
                             >
                               <FileUp className="w-3 h-3" />
                               Download A4 Sheet
                             </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownloadA4PDF(pass)}
                            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium"
                          >
                            <FileUp className="w-4 h-4" />
                            A4
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(pass)}
                            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            PDF
                          </button>
                          <button
                            onClick={() => handleDownloadImage(pass, 'png')}
                            className="flex items-center gap-2 text-teal-400 hover:text-teal-300 text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            PNG
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 items-center ml-auto">
                      {/* Council Visibility Toggle */}
                      <button
                        onClick={() => handleToggleCouncilVisibility(pass.id, pass.is_hidden_from_council || false)}
                        className={`p-2 rounded-lg transition-colors border ${
                           pass.is_hidden_from_council 
                           ? 'bg-gray-700/50 text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-gray-300' 
                           : 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/30 hover:text-indigo-300'
                        }`}
                        title={pass.is_hidden_from_council ? "Hidden from Council (Click to Show)" : "Visible to Council (Click to Hide)"}
                      >
                        {pass.is_hidden_from_council ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleResetPass(pass.id)}
                        className="flex items-center gap-1.5 text-orange-400 hover:text-orange-300 text-sm font-medium"
                        title="Clear scan history"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reset
                      </button>
                      <button
                        onClick={() => handleDeleteVIPPass(pass.id, pass.participant_name)}
                        className="flex items-center gap-1.5 text-red-500 hover:text-red-400 text-sm font-medium"
                        title="Permanent Delete"
                      >
                        <Trash className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}


      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-cyan-500" />
              Entry Pass Registration Settings
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700/30">
                <div className="flex-1">
                  <h4 className="text-white font-semibold mb-1">Show Registration Button on Homepage</h4>
                  <p className="text-gray-400 text-sm">
                    Control whether the "Register for Entry Pass" button appears on the homepage hero section
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={securitySettings?.entry_pass_button_enabled ?? true}
                    onChange={(e) => updateEntryPassButtonSetting(e.target.checked)}
                    disabled={loading}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>
              
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm">
                  💡 <strong>Tip:</strong> Disable this toggle when you want to temporarily stop accepting new entry pass registrations, such as when the event is at capacity or registration has closed.
                </p>
              </div>

              {/* Event Dates Configuration */}
              <div className="pt-6 border-t border-gray-700 mt-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  Event Schedule (Multi-day Access)
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Define the dates of the event. Passes will be valid for <strong>one entry per day</strong> on each of these dates.
                </p>
                <div className="space-y-3">
                  {(securitySettings?.event_dates || []).map((date, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-gray-400 w-16 text-sm font-medium">Day {idx + 1}:</span>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => {
                          const newDates = [...(securitySettings?.event_dates || [])];
                          newDates[idx] = e.target.value;
                          updateSecuritySettings({ event_dates: newDates });
                        }}
                        className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={() => {
                          const newDates = (securitySettings?.event_dates || []).filter((_, i) => i !== idx);
                          updateSecuritySettings({ event_dates: newDates });
                        }}
                        className="text-red-400 hover:text-red-300 p-2 hover:bg-gray-700 rounded transition-colors"
                        title="Remove Day"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      const newDates = [...(securitySettings?.event_dates || []), today];
                      updateSecuritySettings({ event_dates: newDates });
                    }}
                    className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center gap-2 mt-2 px-2 py-1 hover:bg-gray-700/50 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Event Day
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* Council Access Tab */}
      {activeTab === 'council' && (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-purple-500/30">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Lock className="w-6 h-6 text-purple-500" />
            Council Dashboard Access
          </h3>
          <p className="text-gray-400 text-sm mb-6 max-w-2xl">
            Configure access credentials for the Student Council Dashboard. This dashboard is distinct from the security scanner and is used for monitoring attendance statistics and managing VIP passes.
          </p>
          
          <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700/50 max-w-xl">
             <label className="block text-sm font-medium text-gray-400 mb-2">
                Council Password
             </label>
             <div className="flex gap-2">
              <input 
                type="text" 
                value={councilPassword}
                onChange={e => setCouncilPassword(e.target.value)}
                placeholder="Set new password..."
                className="bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg flex-1 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
              <button 
                onClick={updateCouncilPassword}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                   <RefreshCw className="w-4 h-4 animate-spin" />
                   Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Note: This password is required for all Council members to log in.
            </p>
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {!rulesTableReady && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-200/70 text-sm mt-1">
                  The 'validation_rules' table issue detected. 
                  Showing default rules from code. Changes here will not persist.
                </p>
                {ruleLoadError && (
                  <div className="mt-2 bg-black/20 p-2 rounded border border-yellow-500/20">
                     <p className="font-mono text-xs text-yellow-200">{ruleLoadError}</p>
                  </div>
                )}
                <button 
                  onClick={() => loadData()}
                  className="mt-2 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 px-2 py-1 rounded transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          )}
          

          
          <div className="flex gap-2 pb-2">
            <button
              onClick={() => handleCreateRule('date_restriction')}
              disabled={!rulesTableReady}
              className="flex items-center gap-2 px-3 py-2 bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 rounded-lg hover:bg-cyan-600/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Date Rule</span>
            </button>
            <button
              onClick={() => handleCreateRule('time_window')}
              disabled={!rulesTableReady}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 text-purple-400 border border-purple-600/30 rounded-lg hover:bg-purple-600/30 transition-colors"
            >
              <Clock className="w-4 h-4" />
              <span>Add Time Rule</span>
            </button>
          </div>

          <div className="grid gap-4">
            {validationRules.map((rule) => (
              <div key={rule.id} className={`bg-gray-800/50 rounded-lg border p-4 ${rule.is_active ? 'border-green-500/30' : 'border-gray-700'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${rule.is_active ? 'bg-green-500/10 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                      {rule.rule_type === 'date_restriction' ? <Calendar className="w-5 h-5" /> : 
                       rule.rule_type === 'time_window' ? <Clock className="w-5 h-5" /> :
                       <Shield className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{rule.rule_name}</h3>
                      <p className="text-sm text-gray-400">
                        Type: <span className="font-mono text-cyan-400">{rule.rule_type}</span>
                        {rule.pass_type && <span className="ml-2">• Allows: {rule.pass_type === 'vip' ? 'VIP' : rule.pass_type}</span>}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.is_active}
                      onChange={() => handleToggleRule(rule)}
                      disabled={!rulesTableReady}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                  <button onClick={() => handleDeleteRule(rule.id)} className="ml-4 text-gray-500 hover:text-red-400">
                    <Trash className="w-4 h-4" />
                  </button>
                </div>

                {/* Rule Specific Editors */}
                {rule.rule_type === 'date_restriction' && rule.config.allowedDates && (
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <p className="text-sm text-gray-300 mb-2 font-semibold">Allowed Dates (YYYY-MM-DD):</p>
                    <div className="space-y-2">
                       {rule.config.allowedDates?.map((date: string, idx: number) => (
                         <div key={idx} className="flex items-center gap-2">
                           <input type="date" value={date} readOnly className="bg-gray-900 border border-gray-700 rounded px-3 py-1 text-sm text-gray-300 flex-1" />
                           <button 
                             onClick={() => {
                               const newDates = (rule.config.allowedDates || []).filter((_: any, i: number) => i !== idx);
                               handleRuleConfigUpdate(rule.id, { ...rule.config, allowedDates: newDates });
                             }}
                             disabled={!rulesTableReady}
                             className="p-1 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded"
                           >
                             <Trash className="w-4 h-4" />
                           </button>
                         </div>
                       ))}
                       <div className="flex gap-2">
                         <input 
                           type="date" 
                           id={`new-date-${rule.id}`}
                           className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm focus:outline-none focus:border-cyan-500"
                         />
                         <button
                           onClick={() => {
                             const input = document.getElementById(`new-date-${rule.id}`) as HTMLInputElement;
                             if (input && input.value) {
                               const newDates = [...(rule.config.allowedDates || []), input.value];
                               handleRuleConfigUpdate(rule.id, { ...rule.config, allowedDates: newDates });
                               input.value = '';
                             }
                           }}
                           disabled={!rulesTableReady}
                           className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded"
                         >
                           Add Date
                         </button>
                       </div>
                    </div>
                  </div>
                )}
                
                {rule.rule_type === 'time_window' && (
                  <div className="mt-4 pt-4 border-t border-gray-700/50 flex gap-4">
                     <div>
                       <label className="text-xs text-gray-400 block mb-1">Start Time</label>
                       <input 
                         type="time" 
                         value={rule.config.startTime || ''}
                         onChange={(e) => handleRuleConfigUpdate(rule.id, { ...rule.config, startTime: e.target.value })}
                         className="bg-gray-900 border border-gray-700 rounded px-3 py-1 text-white text-sm"
                       />
                     </div>
                     <div>
                       <label className="text-xs text-gray-400 block mb-1">End Time</label>
                       <input 
                         type="time" 
                         value={rule.config.endTime || ''}
                         onChange={(e) => handleRuleConfigUpdate(rule.id, { ...rule.config, endTime: e.target.value })}
                         className="bg-gray-900 border border-gray-700 rounded px-3 py-1 text-white text-sm"
                       />
                     </div>
                  </div>
                )}
                
                {rule.rule_type === 'capacity' && (
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                     <label className="text-xs text-gray-400 block mb-1">Max Capacity</label>
                     <input 
                       type="number" 
                       value={rule.config.maxCapacity || 0}
                       onChange={(e) => handleRuleConfigUpdate(rule.id, { ...rule.config, maxCapacity: parseInt(e.target.value) })}
                       className="bg-gray-900 border border-gray-700 rounded px-3 py-1 text-white text-sm w-32"
                     />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* QR Modal */}
      {selectedPass && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Entry Pass QR Code</h3>
            <QRCodeGenerator
              passToken={selectedPass.pass_token}
              participantName={selectedPass.participant_name}
              passType={selectedPass.pass_type}
              size={256}
            />
            <button
              onClick={() => setSelectedPass(null)}
              className="w-full mt-6 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Scan History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Full Scan History</h3>
            <button
              onClick={() => loadData()}
              className="p-2 text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
              title="Refresh History"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-gray-800/30 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-800/50 border-b border-gray-700">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Participant</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Result</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Guard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {scanHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-500 italic">
                        No scan history found
                      </td>
                    </tr>
                  ) : (
                    scanHistory.map((scan) => (
                      <tr key={scan.id} className="hover:bg-gray-700/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(scan.scanned_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-semibold text-white">{scan.participant_name || 'VIP Guest'}</p>
                          <p className="text-[10px] font-mono text-gray-500">{scan.pass_token}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            scan.pass_type === 'vip' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {scan.pass_type?.toUpperCase() || 'REGULAR'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            scan.scan_result === 'valid' 
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                              : scan.scan_result === 'already_used'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {scan.scan_result === 'already_used' ? 'ALREADY SCANNED' : scan.scan_result.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-400 font-medium font-mono text-[10px]">
                          {scan.guard_name || scan.scanned_by_username || <span className="text-gray-600 italic">Not recorded</span>}
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
      {activeTab === 'design' && (
        <PassTemplateDesigner />
      )}
    </div>
  );
}
