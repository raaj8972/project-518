import type { ScheduleType } from '../../utils/schedulePresentation';

export default function ScheduleTypeToggle({ scheduleType, setScheduleType, available }: {
  scheduleType: ScheduleType;
  setScheduleType: (type: ScheduleType) => void;
  available: ScheduleType[];
}) {
  return <div className="rico-schedule-types" role="group" aria-label="Schedule edition">
    {available.map(type => <button key={type} type="button" aria-pressed={scheduleType === type} onClick={() => setScheduleType(type)}>{type === 'prelims' ? 'Prelims' : 'Main festival'}</button>)}
  </div>;
}
