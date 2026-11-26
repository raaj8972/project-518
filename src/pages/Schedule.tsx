import { useMemo, useState, useEffect, useRef } from 'react';
import { CalendarIcon, DownloadIcon, MagnifyingGlassIcon, MixerHorizontalIcon, ReloadIcon } from '@radix-ui/react-icons';
import { useData } from '../context/DataContext';
import { SEO } from '../components/SEO';
import { BRAND_YEAR } from '../constants/brand';
import ScheduleHeader from '../components/Schedule/ScheduleHeader';
import ScheduleTypeToggle from '../components/Schedule/ScheduleTypeToggle';
import DailyScheduleSection from '../components/Schedule/DailyScheduleSection';
import { scheduleCategory, scheduleDate, scheduleDayType, sortSchedule, type ScheduleType } from '../utils/schedulePresentation';
import '../styles/Schedule.css';

export const Schedule = () => {
  const { schedule = [], events = [], siteSettings, homepageSettings, loading, scheduleError, connectionStatus, refreshAll } = useData();
  const [now, setNow] = useState(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [scheduleType, setScheduleType] = useState<ScheduleType>(siteSettings?.default_schedule_type || 'prelims');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const typeChosen = useRef(false);
  const downloadBusy = useRef(false);
  const pending = loading && !schedule.length;
  const disconnected = !!scheduleError || connectionStatus === 'offline' || connectionStatus === 'degraded';
  const availableTypes = useMemo(() => (['prelims', 'mains'] as const).filter(type => schedule.some(day => scheduleDayType(day) === type)), [schedule]);
  const effectiveType = availableTypes.includes(scheduleType) || !availableTypes.length ? scheduleType : availableTypes[0];
  const days = useMemo(() => sortSchedule(schedule.filter(day => scheduleDayType(day) === effectiveType)), [schedule, effectiveType]);
  const allCategories = useMemo(() => [...new Set(days.flatMap(day => day.events.map(scheduleCategory)))], [days]);
  const effectiveFilter = allCategories.includes(activeFilter) ? activeFilter : 'All';
  const visibleDays = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return days.map(day => ({ ...day, events: day.events.filter(event =>
      (effectiveFilter === 'All' || scheduleCategory(event) === effectiveFilter) &&
      (!query || [event.title, event.venue, event.location, event.description, event.speaker].some(value => value?.toLowerCase().includes(query)))
    ) }));
  }, [days, searchQuery, effectiveFilter]);
  const eventLookup = useMemo(() => new Map(events.map(event => [String(event.id), event])), [events]);
  const hasResults = visibleDays.some(day => day.events.length);
  const filtering = !!searchQuery.trim() || effectiveFilter !== 'All';
  const eligibleDays = filtering && hasResults ? visibleDays.filter(day => day.events.length) : visibleDays;
  const activeDay = eligibleDays.some(day => day.id === selectedDay) ? selectedDay : eligibleDays[0]?.id;

  useEffect(() => {
    const update = () => setNow(new Date());
    const interval = window.setInterval(update, 60_000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', update); };
  }, []);
  useEffect(() => {
    if (!typeChosen.current && siteSettings?.default_schedule_type) setScheduleType(siteSettings.default_schedule_type);
  }, [siteSettings?.default_schedule_type]);
  const chooseType = (type: ScheduleType) => { typeChosen.current = true; setScheduleType(type); setSelectedDay(null); setActiveFilter('All'); setSearchQuery(''); };
  const clearFilters = () => { setSearchQuery(''); setActiveFilter('All'); };
  const download = async () => {
    if (downloadBusy.current || !days.some(day => day.events.length)) return;
    downloadBusy.current = true; setDownloading(true); setDownloadError('');
    try { const { downloadSchedulePdf } = await import('../utils/schedulePdf'); await downloadSchedulePdf(days, effectiveType, homepageSettings?.brand_year || BRAND_YEAR); }
    catch { setDownloadError('The PDF could not download. Please try again.'); }
    finally { downloadBusy.current = false; setDownloading(false); }
  };

  return <div className="rico-schedule-page">
    <SEO title="Rico Schedule — Event Timeline" description="Plan your Ricorrenza. Explore the daily lineup, event times, venues and live festival schedule." canonical="https://ricorrenza.fun/schedule" />
    <ScheduleHeader days={days.length} />
    <div className="rico-schedule-content">
      {scheduleError && !!days.length && <p className="rico-schedule-error" role="alert">The latest schedule could not load. Showing the last available programme. <button type="button" onClick={() => void refreshAll()}>Try again</button></p>}
      {!!days.length && <div className="rico-schedule-days" role="group" aria-label="Schedule days">{days.map((day, index) => <button key={day.id} type="button" aria-pressed={activeDay === day.id} aria-controls={`schedule-day-${day.id}`} onClick={() => setSelectedDay(day.id)}><CalendarIcon aria-hidden="true" /><strong>{day.day || `Day ${index + 1}`}</strong><span>{scheduleDate(day.date, true)}</span></button>)}</div>}
      <div className="rico-schedule-toolbar">
        {availableTypes.length > 1 ? <ScheduleTypeToggle scheduleType={effectiveType} setScheduleType={chooseType} available={availableTypes} /> : <p className="rico-schedule-toolbar__label">The festival, hour by hour<span>All times in IST</span></p>}
        <div className="rico-schedule-filters">
          <label className="rico-schedule-search"><MagnifyingGlassIcon aria-hidden="true" /><span className="sr-only">Search events and venues</span><input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Find an event or venue" /></label>
          <label className="rico-schedule-category"><MixerHorizontalIcon aria-hidden="true" /><span className="sr-only">Filter schedule by category</span><select value={effectiveFilter} onChange={event => setActiveFilter(event.target.value)}><option value="All">All categories</option>{allCategories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
        </div>
      </div>
      {pending ? <div className="rico-schedule-grid" aria-label="Loading schedule" aria-busy="true">{[0, 1].map(index => <div className="rico-schedule-skeleton" key={index}><span /><i /><i /><i /><i /></div>)}</div>
        : days.length && (!filtering || hasResults) ? <div className="rico-schedule-grid">{visibleDays.map((day, idx) => <DailyScheduleSection key={day.id} day={day} idx={idx} now={now} selected={day.id === activeDay} eventLookup={eventLookup} />)}</div>
        : <section className="rico-schedule-empty" aria-live="polite"><CalendarIcon aria-hidden="true" /><h2>{filtering ? 'No matching events' : disconnected ? 'The timeline is a moment away' : 'The stage is being set'}</h2><p>{filtering ? 'Try another event name, venue or category.' : disconnected ? 'The schedule could not load. Please try again.' : 'The festival schedule will appear here as dates and events are announced.'}</p>{filtering ? <button type="button" onClick={clearFilters}>Clear filters</button> : disconnected && <button type="button" onClick={() => void refreshAll()}>Try again<ReloadIcon aria-hidden="true" /></button>}</section>}
      <footer className="rico-schedule-footer">
        <button type="button" className="rico-schedule-download" disabled={downloading || !days.some(day => day.events.length)} onClick={() => void download()}><DownloadIcon aria-hidden="true" />{downloading ? 'Preparing your PDF…' : 'Download full schedule (PDF)'}</button>
        <span className="rico-schedule-ornament" aria-hidden="true"><i /><img src="/images/ricorrenza-medical-mark.svg" alt="" width="42" height="45" /><i /></span>
        <p>* Timings are tentative and subject to change.</p>
      </footer>
      {downloadError && <p className="rico-schedule-error" role="alert">{downloadError}</p>}
    </div>
  </div>;
};
