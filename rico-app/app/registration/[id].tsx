import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Dimensions,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  X, User, Users, Mail, Phone, BookOpen, 
  ChevronRight, Check, AlertCircle, 
  Trophy, Shield, ArrowRight, BookMarked,
  ChevronDown
} from 'lucide-react-native';
import { useData } from '@/components/DataProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Event, SiteSettings } from '@/types/data';
import { supabase } from '../../supabase';

const { width, height } = Dimensions.get('window');

export default function RegistrationScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { events: allEvents, siteSettings, loading: dataLoading } = useData();

  const [event, setEvent] = useState<Event | null>(null);
  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [successId, setSuccessId] = useState('');
  
  const [mode, setMode] = useState<'individual' | 'team'>('individual');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    participant_type: '',
    team_name: '',
    team_members: [] as { name: string; email?: string }[]
  });

  useEffect(() => {
    if (dataLoading) return;
    const e = allEvents.find(ev => ev.id === Number(id));
    if (e) {
      setEvent(e as any);
      if (e.registration_default_mode) setMode(e.registration_default_mode);
    }
    setLoading(false);
  }, [id, allEvents, dataLoading]);

  const participantTypes = useMemo(() => {
    let types = ['Student', 'Faculty', 'Guest'];
    if (event?.registration_participant_types?.length) {
      types = event.registration_participant_types;
    } else if (siteSettings?.registration_participant_types?.length) {
      types = siteSettings.registration_participant_types;
    }
    return types.filter((t: string) => t && !t.toLowerCase().includes('select') && !t.trim().startsWith('.'));
  }, [event, siteSettings]);

  const maxTeamSize = event?.team_max_members || 5;
  const minTeamSize = event?.team_min_members || 2;

  const addTeamMember = () => {
    if (formData.team_members.length < maxTeamSize - 1) {
      setFormData(p => ({ ...p, team_members: [...p.team_members, { name: '', email: '' }] }));
    }
  };

  const removeTeamMember = (idx: number) => {
    setFormData(p => ({ ...p, team_members: p.team_members.filter((_, i) => i !== idx) }));
  };

  const updateMember = (idx: number, name: string) => {
    const next = [...formData.team_members];
    next[idx] = { ...next[idx], name };
    setFormData(p => ({ ...p, team_members: next }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) return Alert.alert('Error', 'Full Name is required');
    if (!formData.email.trim()) return Alert.alert('Error', 'Valid Email is required');
    if (!formData.phone.trim() || formData.phone.length < 10) return Alert.alert('Error', 'Valid 10-digit phone required');
    if (!formData.participant_type) return Alert.alert('Error', 'Please select participant type');
    
    if (mode === 'team') {
      if (!formData.team_name.trim()) return Alert.alert('Error', 'Team Name is required');
      const size = 1 + formData.team_members.filter(m => m.name.trim()).length;
      if (size < minTeamSize) return Alert.alert('Error', `Team needs at least ${minTeamSize} members`);
      if (formData.team_members.some(m => !m.name.trim())) return Alert.alert('Error', 'All team member names are required');
    }

    setSubmitting(true);
    try {
      // 1. Generate ID
      let newId = 'RICO' + Math.floor(100000 + Math.random() * 900000);
      try {
        const { data: last } = await supabase
          .from('registrations')
          .select('id')
          .like('id', 'RICO%')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (last?.id) {
          const match = last.id.match(/^RICO(\d+)$/);
          if (match) newId = `RICO${parseInt(match[1], 10) + 1}`;
        }
      } catch (e) {}

      // 2. Insert
      const payload = {
        id: newId,
        event_id: id,
        event_title: event?.title || 'Unknown Event',
        is_team_registration: mode === 'team',
        team_name: mode === 'team' ? formData.team_name : null,
        full_name: formData.name,
        email: formData.email,
        phone: formData.phone,
        participant_type: formData.participant_type,
        team_members: mode === 'team' ? formData.team_members : null,
        total_members: mode === 'team' ? (formData.team_members.length + 1) : 1,
        registration_date: new Date().toISOString(),
      };

      const { error } = await supabase.from('registrations').insert(payload);
      if (error) {
        if (error.message.includes('unique constraint')) {
          throw new Error('You are already registered for this event');
        }
        throw error;
      }

      setSuccessId(newId);
      setStep('success');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#a855f7" size="large" />
      </View>
    );
  }

  if (step === 'success') {
    return (
      <View style={styles.successContainer}>
        <LinearGradient colors={['#0f172a', '#020617']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.successIconBox}>
          <Check size={48} color="#fff" strokeWidth={4} />
        </View>
        <Text style={styles.successTitle}>YOU'RE IN!</Text>
        <View style={styles.idBadge}>
          <Text style={styles.idLabel}>REGISTRATION ID</Text>
          <Text style={styles.idVal}>{successId}</Text>
        </View>
        <Text style={styles.successSub}>
          Your registration for <Text style={{ color: '#a855f7', fontWeight: '800' }}>{event?.title}</Text> was successful.
          Check your email for the ticket.
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>CLOSE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#030303' }}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{event?.title}</Text>
            <Text style={styles.sub}>Complete your entry mission</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeHeaderBtn}>
            <X size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          
          {/* Mode Switcher */}
          {!event?.registration_mode_locked && (
            <View style={styles.modeContainer}>
              <TouchableOpacity 
                style={[styles.modeBtn, mode === 'individual' && styles.modeBtnActive]}
                onPress={() => setMode('individual')}
              >
                <User size={16} color={mode === 'individual' ? '#fff' : 'rgba(255,255,255,0.4)'} />
                <Text style={[styles.modeText, mode === 'individual' && styles.modeTextActive]}>INDIVIDUAL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modeBtn, mode === 'team' && styles.modeBtnActive]}
                onPress={() => setMode('team')}
              >
                <Users size={16} color={mode === 'team' ? '#fff' : 'rgba(255,255,255,0.4)'} />
                <Text style={[styles.modeText, mode === 'team' && styles.modeTextActive]}>TEAM</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>FULL NAME <Text style={{color: '#ef4444'}}>*</Text></Text>
            <View style={styles.inputBox}>
              <User size={16} color="rgba(255,255,255,0.3)" />
              <TextInput 
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={formData.name}
                onChangeText={t => setFormData(p => ({...p, name: t}))}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>EMAIL <Text style={{color: '#ef4444'}}>*</Text></Text>
              <View style={styles.inputBox}>
                <Mail size={16} color="rgba(255,255,255,0.3)" />
                <TextInput 
                  style={styles.input}
                  placeholder="name@email.com"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={t => setFormData(p => ({...p, email: t}))}
                />
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>PHONE NUMBER <Text style={{color: '#ef4444'}}>*</Text></Text>
            <View style={styles.inputBox}>
              <Phone size={16} color="rgba(255,255,255,0.3)" />
              <TextInput 
                style={styles.input}
                placeholder="10-digit mobile"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="phone-pad"
                maxLength={10}
                value={formData.phone}
                onChangeText={t => setFormData(p => ({...p, phone: t.replace(/\D/g,'')}))}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>PARTICIPANT TYPE <Text style={{color: '#ef4444'}}>*</Text></Text>
            <TouchableOpacity 
              style={[styles.inputBox, formData.participant_type ? {borderColor: 'rgba(168,85,247,0.4)', backgroundColor: 'rgba(168,85,247,0.05)'} : null]} 
              activeOpacity={0.7}
              onPress={() => setShowTypeSelect(true)}
            >
              <BookMarked size={16} color={formData.participant_type ? "#a855f7" : "rgba(255,255,255,0.3)"} />
              <Text style={[styles.input, !formData.participant_type && { color: 'rgba(255,255,255,0.2)' }]}>
                {formData.participant_type || 'Select Option...'}
              </Text>
              <ChevronDown size={16} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          {/* Team Section */}
          {mode === 'team' && (
            <View style={styles.teamSection}>
              <View style={styles.teamHeader}>
                <Trophy size={16} color="#fbbf24" />
                <Text style={styles.teamTitle}>TEAM DETAILS</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>TEAM NAME <Text style={{color: '#ef4444'}}>*</Text></Text>
                <View style={styles.inputBox}>
                  <Shield size={16} color="rgba(255,255,255,0.3)" />
                  <TextInput 
                    style={styles.input}
                    placeholder="E.g. The Avengers"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={formData.team_name}
                    onChangeText={t => setFormData(p => ({...p, team_name: t}))}
                  />
                </View>
              </View>

              <View style={styles.membersList}>
                <View style={styles.membersListHeader}>
                  <Text style={styles.label}>TEAM MEMBERS <Text style={{color: '#ef4444'}}>*</Text> ({formData.team_members.length + 1}/{maxTeamSize})</Text>
                </View>
                
                {formData.team_members.map((member, idx) => (
                  <View key={idx} style={styles.memberInputRow}>
                    <View style={[styles.inputBox, { flex: 1, height: 44 }]}>
                      <TextInput 
                        style={styles.input}
                        placeholder={`Member ${idx + 2} Name *`}
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={member.name}
                        onChangeText={t => updateMember(idx, t)}
                      />
                    </View>
                    <TouchableOpacity onPress={() => removeTeamMember(idx)} style={styles.removeBtn}>
                      <X size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                {formData.team_members.length < maxTeamSize - 1 && (
                  <TouchableOpacity style={styles.addMemberBtn} onPress={addTeamMember}>
                    <Text style={styles.addMemberText}>+ ADD MEMBER</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} 
            onPress={handleSubmit}
            disabled={submitting}
          >
            <LinearGradient 
              colors={['#a855f7', '#6366f1']} 
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.submitContent}>
                <Text style={styles.submitText}>CONFIRM REGISTRATION</Text>
                <ArrowRight size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Custom Type Selector Modal */}
        <Modal visible={showTypeSelect} transparent animationType="fade" onRequestClose={() => setShowTypeSelect(false)}>
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowTypeSelect(false)}
          >
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={styles.typeMenu}>
              <View style={styles.menuHeaderContainer}>
                <Text style={styles.menuHeader}>PARTICIPANT TYPE</Text>
                <TouchableOpacity onPress={() => setShowTypeSelect(false)} style={styles.menuClose}>
                  <X size={14} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    setFormData(p => ({...p, participant_type: ''}));
                    setShowTypeSelect(false);
                  }}
                >
                  <Text style={[styles.menuItemText, !formData.participant_type && styles.menuItemActive]}>
                    Select Option...
                  </Text>
                  {!formData.participant_type && <Check size={14} color="#a855f7" />}
                </TouchableOpacity>

                {participantTypes.map(type => (
                  <TouchableOpacity 
                    key={type} 
                    style={styles.menuItem}
                    onPress={() => {
                      setFormData(p => ({...p, participant_type: type}));
                      setShowTypeSelect(false);
                    }}
                  >
                    <Text style={[styles.menuItemText, formData.participant_type === type && styles.menuItemActive]}>
                      {type}
                    </Text>
                    {formData.participant_type === type && <Check size={14} color="#a855f7" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  loadingContainer: { flex: 1, backgroundColor: '#030303', justifyContent: 'center' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  sub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  closeHeaderBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  
  scroll: { padding: 20 },
  
  modeContainer: { 
    flexDirection: 'row', padding: 4, backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 14, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  modeBtn: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 10
  },
  modeBtnActive: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modeText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  modeTextActive: { color: '#fff' },

  formGroup: { marginBottom: 20 },
  formRow: { flexDirection: 'row', gap: 12 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8, marginLeft: 4 },
  inputBox: { 
    height: 52, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
    paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
  },
  input: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typePill: { 
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  typePillActive: { backgroundColor: 'rgba(168,85,247,0.1)', borderColor: 'rgba(168,85,247,0.4)' },
  typeText: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  typeTextActive: { color: '#a855f7' },

  teamSection: { 
    marginTop: 10, padding: 20, backgroundColor: 'rgba(255,255,255,0.02)', 
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 30
  },
  teamHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  teamTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  membersList: { marginTop: 10 },
  membersListHeader: { marginBottom: 10 },
  memberInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  removeBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.05)', alignItems: 'center', justifyContent: 'center' },
  addMemberBtn: { 
    marginTop: 8, height: 44, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' 
  },
  addMemberText: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  submitBtn: { 
    height: 64, borderRadius: 20, overflow: 'hidden', marginTop: 10,
    shadowColor: '#a855f7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },

  // Success
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  successIconBox: { 
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#10b981', 
    alignItems: 'center', justifyContent: 'center', marginBottom: 30,
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20
  },
  successTitle: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 2, marginBottom: 30 },
  idBadge: { 
    backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 25, paddingVertical: 15, 
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', marginBottom: 30 
  },
  idLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  idVal: { color: '#a855f7', fontSize: 24, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  successSub: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 15, lineHeight: 24, marginBottom: 40 },
  doneBtn: { 
    width: '100%', height: 56, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center'
  },
  doneBtnText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },

  // Dropdown Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  typeMenu: { 
    width: '100%', maxHeight: height * 0.6, backgroundColor: '#0A0A15', 
    borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.5, shadowRadius: 30
  },
  menuHeaderContainer: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' 
  },
  menuHeader: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  menuClose: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  menuItem: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 18, paddingHorizontal: 15, borderRadius: 12, marginBottom: 4
  },
  menuItemText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' },
  menuItemActive: { color: '#a855f7', fontWeight: '800' }
});
