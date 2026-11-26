import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CalendarIcon,
  CheckCircledIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PinRightIcon,
  Share1Icon,
  UpdateIcon,
} from '@radix-ui/react-icons';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { entryPassFile } from '../../utils/entryPassActions';
import { downloadFile } from '../../utils/eventActions';
import { studentPassStatus } from '../../utils/studentDashboard';
import { eventDate } from '../../utils/eventPresentation';
import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';
import { resolveDayConfig, type TemplateConfig } from '../../utils/passRenderer';

export interface StudentEntryPass {
  id?: string;
  pass_token: string;
  pass_type: string;
  participant_name: string;
  created_at: string;
  valid_date?: string;
  venue?: string;
  event_name?: string;
  day_number?: number;
  is_used?: boolean;
  scanned_at?: string;
}

export default function EntryPass({ pass }: { pass: StudentEntryPass }) {
  const [gateStatus, setGateStatus] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [designedConfig, setDesignedConfig] = useState<TemplateConfig | null>(null);
  const [eventDates, setEventDates] = useState<string[]>([]);

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const status = studentPassStatus(pass);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('security_settings_public')
          .select('pass_template_config, event_dates')
          .single();
        if (!active || !data) return;
        const dates: string[] = data.event_dates || [];
        setEventDates(dates);

        let dayIdx = pass.day_number ? Math.max(0, pass.day_number - 1) : 0;
        if (pass.valid_date && dates.length > 0) {
          const matched = dates.indexOf(pass.valid_date);
          if (matched >= 0) dayIdx = matched;
        }
        const cfg = resolveDayConfig(
          (data.pass_template_config || {}) as Record<string, TemplateConfig>,
          dayIdx
        );
        if (cfg?.bgUrl) setDesignedConfig(cfg);
      } catch {
        // Ignore and use standard card view
      }
    })();
    return () => {
      active = false;
    };
  }, [pass.day_number, pass.valid_date]);

  const qrValue =
    pass.valid_date && !pass.pass_token.includes('|')
      ? `${pass.pass_token}|${pass.valid_date}`
      : pass.pass_token;

  const save = async (share = false) => {
    setSaving(true);
    try {
      const file = await entryPassFile(pass);
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Ricorrenza pass' });
      } else {
        downloadFile(file, file.name);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast.error('Could not save your pass. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const checkGate = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase
        .from('entry_passes')
        .select('is_active, is_used, scanned_at, valid_date')
        .eq('pass_token', pass.pass_token)
        .single();
      if (error) throw error;
      setGateStatus(
        !data.is_active
          ? 'Pass deactivated. Contact the help desk.'
          : data.valid_date && data.valid_date !== today
          ? `Valid on ${eventDate(data.valid_date)}`
          : data.is_used || data.scanned_at
          ? 'Already checked in'
          : 'Pass active and ready for check-in'
      );
    } catch {
      setGateStatus('Could not check the current status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <article className="sd-ticket">
      <div className="sd-ticket-brand">
        <span>
          {BRAND_NAME} <b>{BRAND_YEAR}</b>
        </span>
        <span>{pass.day_number ? `DAY ${pass.day_number}` : 'FESTIVAL PASS'}</span>
      </div>

      <div className="sd-ticket-person">
        <span className={`sd-status sd-status-${status.tone}`}>
          <CheckCircledIcon />
          {status.label}
        </span>
        <h2>{pass.participant_name}</h2>
        <p>{pass.event_name || (pass.pass_type || 'Festival entry').replace(/_/g, ' ')}</p>
      </div>

      {/* Show custom designed pass with positioned Name, QR, Gate Time & Allowed Limit when configured */}
      {designedConfig?.bgUrl ? (
        <div className="my-3">
          <div
            className="relative w-full rounded-xl overflow-hidden border border-black/10 bg-white shadow-sm"
            style={{
              aspectRatio: String(
                designedConfig.aspectRatio && designedConfig.aspectRatio > 0
                  ? designedConfig.aspectRatio
                  : 3
              ),
              containerType: 'inline-size',
            }}
          >
            <img
              src={designedConfig.bgUrl}
              alt="Your event pass design"
              className="w-full h-full object-cover"
            />
            <div
              style={{
                left: `${designedConfig.qr?.x ?? 84}%`,
                top: `${designedConfig.qr?.y ?? 50}%`,
                width: `${designedConfig.qr?.size ?? 18}%`,
                aspectRatio: '1 / 1',
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute p-1 rounded flex items-center justify-center ${
                designedConfig.qr?.transparentBg ? 'bg-transparent' : 'bg-white shadow-sm'
              }`}
            >
              <QRCodeSVG
                value={qrValue}
                bgColor={designedConfig.qr?.transparentBg ? 'transparent' : '#ffffff'}
                style={{ width: '100%', height: '100%' }}
                marginSize={0}
                level="H"
                title="Your festival entry QR code"
              />
            </div>

            {designedConfig.name?.enabled && pass.participant_name && (
              <div
                style={{
                  left: `${designedConfig.name.x}%`,
                  top: `${designedConfig.name.y}%`,
                  transform: `translate(${
                    designedConfig.name.align === 'left'
                      ? '0%'
                      : designedConfig.name.align === 'right'
                      ? '-100%'
                      : '-50%'
                  }, -50%)`,
                  fontSize: `${designedConfig.name.fontSize || 3}cqw`,
                  fontWeight: designedConfig.name.bold ? 700 : 500,
                  fontFamily: designedConfig.name.fontFamily
                    ? `"${designedConfig.name.fontFamily}", sans-serif`
                    : 'sans-serif',
                  color: designedConfig.name.color || '#111827',
                }}
                className="absolute whitespace-nowrap leading-none"
              >
                {pass.participant_name}
              </div>
            )}

            {designedConfig.gateTime?.enabled && designedConfig.gateTime.text && (
              <div
                style={{
                  left: `${designedConfig.gateTime.x}%`,
                  top: `${designedConfig.gateTime.y}%`,
                  transform: `translate(${
                    designedConfig.gateTime.align === 'left'
                      ? '0%'
                      : designedConfig.gateTime.align === 'right'
                      ? '-100%'
                      : '-50%'
                  }, -50%)`,
                  fontSize: `${designedConfig.gateTime.fontSize || 2}cqw`,
                  fontWeight: designedConfig.gateTime.bold ? 700 : 500,
                  color: designedConfig.gateTime.color || '#374151',
                }}
                className="absolute whitespace-nowrap leading-none"
              >
                {designedConfig.gateTime.text}
              </div>
            )}

            {designedConfig.allowedLimit?.enabled && designedConfig.allowedLimit.text && (
              <div
                style={{
                  left: `${designedConfig.allowedLimit.x}%`,
                  top: `${designedConfig.allowedLimit.y}%`,
                  transform: `translate(${
                    designedConfig.allowedLimit.align === 'left'
                      ? '0%'
                      : designedConfig.allowedLimit.align === 'right'
                      ? '-100%'
                      : '-50%'
                  }, -50%)`,
                  fontSize: `${designedConfig.allowedLimit.fontSize || 2}cqw`,
                  fontWeight: designedConfig.allowedLimit.bold ? 700 : 500,
                  color: designedConfig.allowedLimit.color || '#426b52',
                }}
                className="absolute whitespace-nowrap leading-none"
              >
                {designedConfig.allowedLimit.text}
              </div>
            )}

            {designedConfig.dateLabel?.enabled &&
              (pass.valid_date || eventDates[(pass.day_number || 1) - 1]) && (
                <div
                  style={{
                    left: `${designedConfig.dateLabel.x}%`,
                    top: `${designedConfig.dateLabel.y}%`,
                    transform: `translate(${
                      designedConfig.dateLabel.align === 'left'
                        ? '0%'
                        : designedConfig.dateLabel.align === 'right'
                        ? '-100%'
                        : '-50%'
                    }, -50%)`,
                    fontSize: `${designedConfig.dateLabel.fontSize || 2}cqw`,
                    fontWeight: designedConfig.dateLabel.bold ? 700 : 500,
                    color: designedConfig.dateLabel.color || '#4b5563',
                  }}
                  className="absolute whitespace-nowrap leading-none"
                >
                  {pass.valid_date || eventDates[(pass.day_number || 1) - 1]}
                </div>
              )}
          </div>
          <p className="text-center text-xs mt-2 opacity-75">
            Show this QR code to the team at the gate.
          </p>
        </div>
      ) : (
        <div className="sd-ticket-code">
          <div className="sd-qr-surface">
            <QRCodeSVG
              value={qrValue}
              size={200}
              level="H"
              includeMargin
              title="Your festival entry QR code"
            />
          </div>
          <p>Show this QR code to the team at the gate.</p>
        </div>
      )}

      <dl className="sd-ticket-details">
        <div>
          <dt>
            <CalendarIcon /> Valid date
          </dt>
          <dd>{pass.valid_date ? eventDate(pass.valid_date) : 'See festival entry details'}</dd>
        </div>
        <div>
          <dt>
            <PinRightIcon /> Venue
          </dt>
          <dd>{pass.venue || 'IQ City Medical College'}</dd>
        </div>
        {designedConfig?.gateTime?.enabled && designedConfig.gateTime.text && (
          <div>
            <dt>Gate timing</dt>
            <dd>{designedConfig.gateTime.text}</dd>
          </div>
        )}
        {designedConfig?.allowedLimit?.enabled && designedConfig.allowedLimit.text && (
          <div>
            <dt>Allowed entry</dt>
            <dd>{designedConfig.allowedLimit.text}</dd>
          </div>
        )}
      </dl>

      {gateStatus && (
        <p role="status" className="sd-ticket-gate">
          {gateStatus}
        </p>
      )}

      <div className="sd-ticket-actions">
        <button disabled={saving} onClick={() => void save()}>
          <DownloadIcon />
          {saving ? 'Saving…' : 'Save pass'}
        </button>
        <button disabled={checking} onClick={() => void checkGate()}>
          <UpdateIcon />
          {checking ? 'Checking…' : 'Gate status'}
        </button>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            pass.venue || 'IQ City Medical College'
          )}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLinkIcon />
          Directions
        </a>
        <button disabled={saving} onClick={() => void save(true)}>
          <Share1Icon />
          Share
        </button>
      </div>
    </article>
  );
}
