import { supabase } from '../lib/supabase';
import {
  loadSafeImage,
  renderPassToCanvas,
  resolveDayConfig,
  type TemplateConfig,
} from './passRenderer';

export interface DownloadablePass {
  id?: string;
  pass_token: string;
  participant_name: string;
  pass_type: string;
  venue?: string;
  valid_date?: string;
  day_number?: number;
}

/**
 * Generates a crisp, designed PDF for a student's own entry pass.
 * Uses the admin's Pass Editor template for that day if configured, falling back cleanly if not.
 */
export async function entryPassFile(pass: DownloadablePass): Promise<File> {
  const { data: settings } = await supabase
    .from('security_settings_public')
    .select('pass_template_config, event_dates')
    .single();

  const templateConfigs = (settings?.pass_template_config || {}) as Record<string, TemplateConfig>;
  const eventDates: string[] = settings?.event_dates || [];

  let dayIndex = pass.day_number ? Math.max(0, pass.day_number - 1) : 0;
  if (pass.valid_date && eventDates.length > 0) {
    const idx = eventDates.indexOf(pass.valid_date);
    if (idx >= 0) dayIndex = idx;
  }

  const config = resolveDayConfig(templateConfigs, dayIndex);
  const bgImage = config?.bgUrl ? await loadSafeImage(config.bgUrl) : undefined;

  const canvas = await renderPassToCanvas({
    pass: {
      id: pass.id || pass.pass_token,
      token: pass.pass_token,
      name: pass.participant_name || 'Participant',
      type: pass.pass_type || 'student',
      valid_date: pass.valid_date,
      includeName: true,
    },
    dayIndex,
    config,
    bgImage,
    eventDates,
    includeName: true,
    targetWidth: 2200,
  });

  const { jsPDF } = await import('jspdf');
  const pgW = canvas.width;
  const pgH = canvas.height;
  const doc = new jsPDF({
    orientation: pgW >= pgH ? 'landscape' : 'portrait',
    unit: 'px',
    format: [pgW, pgH],
    hotfixes: ['px_scaling'],
  });
  doc.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, pgW, pgH, undefined, 'FAST');

  return new File([doc.output('blob')], 'ricorrenza-entry-pass.pdf', {
    type: 'application/pdf',
  });
}
