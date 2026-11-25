import { useRef, useState } from 'react';
import { useStudentAuth } from '../context/StudentAuthContext';
import { loadStudentSchedule } from '../services/studentEventTools';
import { findScheduleClashes, type ScheduledEvent, type ScheduleClash } from '../utils/scheduleClashes';
import '../styles/StudentEventTools.css';

export function useScheduleClashCheck() {
  const { user } = useStudentAuth();
  const [clashes, setClashes] = useState<ScheduleClash[]>([]);
  const [error, setError] = useState(false);
  const [acknowledged, setAcknowledged] = useState('');
  const lock = useRef(false);
  const fingerprint = JSON.stringify([user?.id, clashes.map(clash => clash.key)]);
  const check = async (candidates: ScheduledEvent[]) => {
    if (!user) return true;
    if (lock.current) return false;
    lock.current = true;
    try {
      const existing = await loadStudentSchedule(user.id);
      const conflicts = findScheduleClashes(candidates, existing);
      const key = JSON.stringify([user.id, conflicts.map(conflict => conflict.key)]);
      setClashes(conflicts); setError(false);
      return conflicts.length === 0 || key === acknowledged;
    } catch { setError(true); return false; }
    finally { lock.current = false; }
  };
  const notice = error ? <div className="student-clash-warning" role="alert">Your schedule could not be checked. Please try registering again to retry.</div> : clashes.length > 0 ? <div className="student-clash-warning" role="alert">
    <strong>Check your schedule before continuing</strong>
    <ul>
      {clashes.map(clash => <li key={clash.key}>
        <b>
          {clash.event.title}
        </b> {clash.definite ? 'overlaps with' : 'is on the same day as'} <b>
          {clash.other.title}
        </b> ({clash.other.date}, {clash.other.time}).{!clash.definite && ' An end time is unconfirmed, so a clash is possible.'}
      </li>)}
    </ul>
    <p>This checks your own entries and events in this checkout. Teammates should check their schedules too.</p>
    <label>
      <input type="checkbox" checked={acknowledged === fingerprint} onChange={event => setAcknowledged(event.target.checked ? fingerprint : '')} /> I’ve reviewed these times and want to continue.</label>
  </div> : null;
  const reset = () => { setClashes([]); setError(false); setAcknowledged(''); };
  return { check, notice, reset };
}
