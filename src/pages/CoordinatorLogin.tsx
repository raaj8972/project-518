import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, CalendarCheck, ChevronDown, Eye, EyeOff, Lock, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { useData } from '../context/DataContext';
import { useToast } from '../components/ToastProvider';
import { SEO } from '../components/SEO';
import { StaffPortalLayout } from '../components/StaffPortalLayout';

export const CoordinatorLogin = () => {
  const { events, loading: eventsLoading } = useData();
  const navigate = useNavigate();
  const { push } = useToast();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const enabledEvents = events?.filter(event => event.visible !== false) || [];

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (!selectedEventId || !password) {
      setError(!selectedEventId ? 'Please select your event.' : 'Please enter your access code.');
      return;
    }
    setLoading(true);
    try {
      const selectedEvent = enabledEvents.find(item => String(item.id) === selectedEventId);
      if (!selectedEvent) throw new Error('This event is no longer available. Please choose another event.');
      const response = await fetch('/api/coordinator-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEvent.id, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sign-in failed. Check your access code.');
      const { data: verified, error: authError } = await supabase.auth.verifyOtp({ token_hash: result.token_hash, type: result.type || 'magiclink' });
      if (authError || !verified.session) throw authError || new Error('Could not establish your session. Please try again.');
      const session = {
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        token: verified.session.access_token,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        timestamp: Date.now(),
      };
      sessionStorage.setItem('coordinator_session', JSON.stringify(session));
      push({ message: `Welcome, Coordinator for ${selectedEvent.title}!`, type: 'success' });
      navigate('/coordinator/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally { setLoading(false); }
  };

  return <StaffPortalLayout
    title="Event Coordinator" eyebrow="Registration management" description="Choose your event and sign in to your workspace."
    icon={Users} storyTitle={<>Your event.<br /><em>In good hands.</em></>}
    storyDescription="Bring your team together, keep registrations organised and make every round count."
    features={[{ icon: CalendarCheck, label: 'Event operations' }, { icon: Users, label: 'Registrations' }, { icon: Lock, label: 'Event-specific access' }]}
    footerLabel="Coordinator portal"
  >
    <SEO title="Coordinator Login" description={`Event coordinator access for ${BRAND_NAME} ${BRAND_YEAR}.`} canonical="https://ricorrenza.fun/coordinator" />
    <form onSubmit={handleLogin} className="staff-login-form" aria-busy={loading}>
      {error && <div className="staff-login-message" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}
      <div className="staff-login-field">
        <label htmlFor="coordinator-event">Select event</label>
        <div className="staff-portal-select">
          <select id="coordinator-event" name="event" required disabled={loading || !enabledEvents.length} value={selectedEventId} onChange={event => { setSelectedEventId(event.target.value); setPassword(''); setError(''); }} aria-describedby={!enabledEvents.length ? 'coordinator-event-status' : undefined}>
            <option value="">{eventsLoading && !enabledEvents.length ? 'Loading events…' : 'Choose your event'}</option>
            {enabledEvents.map(event => <option key={event.id} value={String(event.id)}>{event.title}</option>)}
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </div>
        {!enabledEvents.length && <p id="coordinator-event-status" className="staff-portal-field-help" role="status">{eventsLoading ? 'Fetching available events. Please wait.' : 'No events are available right now. Contact your festival admin for access.'}</p>}
      </div>
      <div className="staff-login-field">
        <label htmlFor="coordinator-code">Access code</label>
        <div className="staff-login-password">
          <input id="coordinator-code" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your event access code" required disabled={loading} />
          <button type="button" aria-label={showPassword ? 'Hide access code' : 'Show access code'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
      </div>
      <button className="staff-login-primary" type="submit" disabled={loading || !selectedEventId || !password}><Users size={17} />{loading ? 'Signing in…' : 'Access dashboard'}{!loading && <ArrowUpRight size={17} />}</button>
      <span className="staff-login-sr-only" role="status">{loading ? 'Verifying your event access' : ''}</span>
    </form>
    <div className="staff-portal-notice"><Lock size={16} /><p>For authorised event coordinators.<br /><span>Need an access code? Contact your festival admin.</span></p></div>
  </StaffPortalLayout>;
};
