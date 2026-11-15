import { useId, type ReactNode } from 'react';
import { CheckIcon } from '@radix-ui/react-icons';

interface FieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  type?: 'text' | 'url' | 'number';
  min?: number;
  max?: number;
  count?: boolean;
}
export function StudioField({ label, value, onChange, hint, placeholder, multiline, required, type = 'text', min, max, count }: FieldProps) {
  const id = useId();
  const props = { id, value, placeholder, required, 'aria-describedby': hint ? `${id}-hint` : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value) };
  return <div className="studio-field">
    <div className="studio-field-label"><label htmlFor={id}>{label}</label>{count && <span>{String(value).length} characters</span>}</div>
    {multiline ? <textarea {...props} rows={4} /> : <input {...props} type={type} min={min} max={max} />}
    {hint && <p id={`${id}-hint`}>{hint}</p>}
  </div>;
}
export function StudioToggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId();
  return <div className="studio-toggle-row"><div><span id={id}>{label}</span>{description && <p>{description}</p>}</div><button type="button" role="switch" aria-labelledby={id} aria-checked={checked} onClick={() => onChange(!checked)} className="studio-switch"><span>{checked && <CheckIcon />}</span></button></div>;
}
export function StudioRange({ label, value, onChange, min, max, step = 1, unit = '' }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; step?: number; unit?: string }) {
  const id = useId();
  return <div className="studio-field studio-range"><div className="studio-field-label"><label htmlFor={id}>{label}</label><output htmlFor={id}>{value}{unit}</output></div><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} /></div>;
}
export function StudioGroup({ title, description, children }: { title?: string; description?: string; children: ReactNode }) {
  return <section className="studio-field-group">{title && <div className="studio-group-heading"><h3>{title}</h3>{description && <p>{description}</p>}</div>}{children}</section>;
}
export function StudioDirection({ value, onChange, label = 'Scroll direction' }: { value: 'left' | 'right'; onChange: (value: 'left' | 'right') => void; label?: string }) {
  return <div className="studio-field"><span className="studio-field-label">{label}</span><div className="studio-choice" role="group" aria-label={label}>{(['left', 'right'] as const).map(direction => <button type="button" key={direction} aria-pressed={value === direction} onClick={() => onChange(direction)}>{direction === 'left' ? 'Right to left' : 'Left to right'}</button>)}</div></div>;
}
