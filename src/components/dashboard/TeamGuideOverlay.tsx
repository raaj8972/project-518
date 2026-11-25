import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import '../../styles/StudentTeams.css';
export const TEAM_GUIDE_STEPS = [
  { title: 'Your college number is your identity', text: 'Add your real IQMG number in My profile. Each number belongs to one account. Admin verifies it from the college PDF roster; duplicate or wrong claims can be corrected there.' },
  { title: 'Invite a friend by IQMG', text: 'Create a team, enter your friend’s exact verified IQMG number, check their name and batch, then send an invitation. They must accept it. Sending an invitation never adds someone automatically.' },
  { title: 'Join with a unique Team ID', text: 'Every team gets its own TEAM ID. Ask the captain for it, find the team, and send a request to join. The captain must approve your request before you become a member.' },
  { title: 'Team membership and event approval are separate', text: 'Only accepted members count during team checkout. Register your team for an event after everyone accepts. The event coordinator then reviews registration; the event WhatsApp group unlocks only after approval. Pending requests expire after 72 hours.' },
];
export default function TeamGuideOverlay({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);
  const seen = useRef(false);
  const key = `rico_team_guide_v1:${userId}`;
  useEffect(() => {
    seen.current = false;
    setOpen(false);
    let active = true;
    const show = () => {
      if (active && !seen.current) { setStep(0); setOpen(true); }
    };
    const listener = (event: Event) => {
      if ((event as CustomEvent).detail === userId) show();
    };
    window.addEventListener('rico-student-tour-finished', listener);
    void (async () => {
      try {
        if (localStorage.getItem(key)) { seen.current = true; return; }
        const { data, error } = await supabase.from('student_dashboard_onboarding')
          .select('tour_version').eq('user_id', userId).in('tour_version', [1, 101]);
        if (error) throw error;
        if (data?.some(row => row.tour_version === 101)) { seen.current = true; return; }
        if (data?.some(row => row.tour_version === 1) || localStorage.getItem(`rico_student_tour_v1:${userId}`)) show();
      } catch { /* The replay button and inline instructions remain available. */ }
    })();
    return () => { active = false; window.removeEventListener('rico-student-tour-finished', listener); };
  }, [userId, key]);
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const previous = document.body.style.overflow;
    const trigger = document.activeElement as HTMLElement | null;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previous; trigger?.focus(); };
  }, [open]);
  useEffect(() => { if (open) ref.current?.querySelector<HTMLElement>('h2')?.focus(); }, [open, step]);
  const close = (status: 'completed' | 'skipped') => {
    setOpen(false);
    seen.current = true;
    try { localStorage.setItem(key, status); } catch { /* The server preference is also saved. */ }
    void supabase.from('student_dashboard_onboarding').upsert({ user_id: userId, tour_version: 101, status }).then(() => {});
  };
  return <>
    <button className="sd-button sd-button-secondary" onClick={() => { setStep(0); setOpen(true); }}>How teams work</button>
    {open && <dialog className="st-tour" ref={ref} aria-labelledby="team-guide-title" aria-describedby="team-guide-text" onCancel={event => { event.preventDefault(); close('skipped'); }}>
      <div className="st-tour-top">
        <span>MY TEAMS · {step + 1} / {TEAM_GUIDE_STEPS.length}
        </span>
        <button aria-label="Skip team guide" onClick={() => close('skipped')}>×</button>
      </div>
      <h2 id="team-guide-title" tabIndex={-1}>
        {TEAM_GUIDE_STEPS[step].title}
      </h2>
      <p id="team-guide-text">
        {TEAM_GUIDE_STEPS[step].text}
      </p>
      <footer>
        <button onClick={() => close('skipped')}>Skip guide</button>
        <div>
          <button disabled={step === 0} onClick={() => setStep(value => value - 1)}>Back</button>
          <button onClick={() => step === TEAM_GUIDE_STEPS.length - 1 ? close('completed') : setStep(value => value + 1)}>
            {step === TEAM_GUIDE_STEPS.length - 1 ? 'Got it' : 'Next'}
          </button>
        </div>
      </footer>
    </dialog>}
  </>;
}
