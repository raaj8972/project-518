import '../../styles/StudentGuide.css';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, Cross2Icon, ReaderIcon } from '@radix-ui/react-icons';
import { hasSeenStudentTour, saveStudentTour, studentTourKey } from '../../services/studentRewards';
import { STUDENT_GUIDE_STEPS } from '../../utils/studentGuide';

export default function StudentDashboardTour({ userId }: { userId?: string; }) {
  const location = useLocation(); const navigate = useNavigate();
  const ref = useRef<HTMLDialogElement>(null);
  const [owner, setOwner] = useState<string>();
  const [step, setStep] = useState(0);
  const openedFor = useRef<string>();
  const manual = new URLSearchParams(location.search).get('tour') === '1';
  useEffect(() => {
    if (!userId || openedFor.current === userId) return;
    let active = true;
    const openIfNew = async () => {
      try {
        let local = false; try { local = !!localStorage.getItem(studentTourKey(userId)); } catch { /* Account storage still works. */ }
        if (local || await hasSeenStudentTour(userId)) { if (active) openedFor.current = userId; return; }
        if (active && openedFor.current !== userId) { openedFor.current = userId; setStep(0); setOwner(userId); }
      } catch { /* The permanent guide remains available if this first-login check cannot load. */ }
    };
    void openIfNew();
    return () => { active = false; };
  }, [userId]);
  useEffect(() => {
    if (!userId || !manual) return;
    openedFor.current = userId; setStep(0); setOwner(userId);
    const query = new URLSearchParams(location.search); query.delete('tour');
    navigate({ pathname: location.pathname, search: query.toString(), hash: location.hash }, { replace: true });
  }, [manual, userId, location.pathname, location.search, location.hash, navigate]);
  const open = !!userId && owner === userId;
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previous; trigger?.focus(); };
  }, [open]);
  useEffect(() => { if (open) { const title = ref.current?.querySelector<HTMLElement>('h2'); title?.focus(); if (ref.current) ref.current.scrollTop = 0; } }, [open, step]);
  const finish = (status: 'completed' | 'skipped', path?: string) => {
    if (!userId) return;
    setOwner(undefined); openedFor.current = userId;
    try { localStorage.setItem(studentTourKey(userId), status); } catch { /* Remote preference is still persisted. */ }
    void saveStudentTour(userId, status).catch(() => { /* The device preference prevents repeated interruptions while offline. */ });
    window.dispatchEvent(new CustomEvent('rico-student-tour-finished',{detail:userId}));
    if (path) navigate(path);
  };
  const item = STUDENT_GUIDE_STEPS[step];
  if (!open) return null;
  return <dialog ref={ref} className="sd-tour" aria-labelledby="student-tour-title" aria-describedby="student-tour-description" onCancel={event => { event.preventDefault(); finish('skipped'); }}>
    <header>
      <span className="sd-eyebrow">YOUR STUDENT DASHBOARD · QUICK TOUR</span>
      <button className="sd-icon-button" aria-label="Skip dashboard tour" onClick={() => finish('skipped')}>
        <Cross2Icon />
      </button>
    </header>
    <div className="sd-tour-progress" role="progressbar" aria-label="Dashboard tour progress" aria-valuemin={1} aria-valuemax={STUDENT_GUIDE_STEPS.length} aria-valuenow={step + 1}>
      {STUDENT_GUIDE_STEPS.map((entry, index) => <span key={entry.id} className={index <= step ? 'is-done' : ''} />)}
    </div>
    <div className="sd-tour-body">
      <span className="sd-tour-step">
        {String(step + 1).padStart(2, '0')} / {String(STUDENT_GUIDE_STEPS.length).padStart(2, '0')}
      </span>
      <h2 id="student-tour-title" tabIndex={-1}>
        {item.title}
      </h2>
      <p id="student-tour-description">
        {item.description}
      </p>
      <div className="sd-tour-location">
        <ReaderIcon />
        <span>
          <strong>Where to find it</strong>
          {item.location}
        </span>
      </div>
      <ul>
        {item.tips.map(tip => <li key={tip}>
          <CheckIcon />
          {tip}
        </li>)}
      </ul>
      <button className="sd-tour-open-section" onClick={() => finish('skipped', item.path)}>
        {item.action}<ArrowRightIcon />
      </button>
    </div>
    <footer>
      <button className="sd-tour-skip" onClick={() => finish('skipped')}>Skip tour</button>
      <div>
        <button className="sd-button sd-button-secondary" disabled={step === 0} onClick={() => setStep(value => value - 1)}>
          <ArrowLeftIcon /> Back</button>
        <button className="sd-button" onClick={() => step === STUDENT_GUIDE_STEPS.length - 1 ? finish('completed') : setStep(value => value + 1)}>
          {step === STUDENT_GUIDE_STEPS.length - 1 ? 'Finish tour' : 'Next'}<ArrowRightIcon />
        </button>
      </div>
    </footer>
  </dialog>;
}
