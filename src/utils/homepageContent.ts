import { textValue } from './studioData';
import type { Event, Sponsor } from '../types/data';
import { BRAND_YEAR } from '../constants/brand';

export interface HomepagePartner {
  id: string;
  name: string;
  logo_url: string;
  website?: string;
  enabled: boolean;
  featured?: boolean;
  order: number;
  period?: 'previous' | 'current';
  sponsor_id?: number;
  edition_year?: number;
  partner_category?: string;
  archived_sponsor_id?: number;
}
export interface DisplayPartner extends Sponsor {
  period: 'previous' | 'current';
  edition_year?: number;
  partner_category?: string;
}
export type PartnerPlacementPatch = Partial<Pick<HomepagePartner, 'period' | 'enabled' | 'edition_year' | 'partner_category'>>;
export function readHomepagePartners(value: unknown): HomepagePartner[] {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item === 'object' && !Array.isArray(item)).map((item, index) => ({
    id: String(item.id || `legacy-${index}`), name: textValue(item.name), logo_url: textValue(item.logo_url, textValue(item.logo)), website: typeof item.website === 'string' ? item.website : '',
    enabled: item.enabled !== false, ...(typeof item.featured === 'boolean' ? {featured:item.featured} : {}), order: Number(item.order) || index + 1, period: item.period === 'current' ? 'current' : 'previous', ...(Number.isFinite(Number(item.sponsor_id)) && item.sponsor_id != null ? { sponsor_id: Number(item.sponsor_id) } : {}),
    ...(Number.isInteger(Number(item.edition_year)) && Number(item.edition_year) >= 2000 && Number(item.edition_year) <= 2200 ? { edition_year: Number(item.edition_year) } : {}),
    ...(typeof item.partner_category === 'string' && item.partner_category.trim() ? { partner_category: item.partner_category.trim().slice(0, 80) } : {}),
    ...(Number.isInteger(Number(item.archived_sponsor_id)) && Number(item.archived_sponsor_id) > 0 ? { archived_sponsor_id: Number(item.archived_sponsor_id) } : {}),
  }));
}
function partnerWebsite(value: unknown): string | null { if (typeof value !== 'string' || !value.trim()) return null; try { const url = new URL(value); return ['http:','https:'].includes(url.protocol) ? value : null; } catch { return null; } }
export function sponsorPlacement(sponsor: Sponsor, value: unknown) {
  return readHomepagePartners(value).find(record => record.sponsor_id === sponsor.id)
    || readHomepagePartners(value).find(record => !record.sponsor_id && !record.archived_sponsor_id && record.name.trim().toLowerCase() === textValue(sponsor.name).trim().toLowerCase() && record.logo_url === sponsor.logo);
}
export function partnerPlacementPeriod(placement: Pick<HomepagePartner, 'period' | 'edition_year'> | undefined, currentYear = Number(BRAND_YEAR)): 'previous' | 'current' {
  if (placement?.edition_year && placement.edition_year < currentYear) return 'previous';
  return placement?.period || 'previous';
}
export function rolloverPartnerPlacements(value: unknown, previousYear: number, nextYear: number): HomepagePartner[] {
  return readHomepagePartners(value).map(record => {
    if (nextYear <= previousYear || record.period !== 'current') return record;
    const editionYear = record.edition_year || previousYear;
    return editionYear < nextYear ? { ...record, period: 'previous', edition_year: editionYear } : record;
  });
}
export function setSponsorPlacement(sponsor: Sponsor, value: unknown, patch: PartnerPlacementPatch, currentYear = Number(BRAND_YEAR)) {
  const records=readHomepagePartners(value);const existing=sponsorPlacement(sponsor,records);
  const next:HomepagePartner={...existing,id:existing?.id || `sponsor-${sponsor.id}`,sponsor_id:sponsor.id,name:sponsor.name,logo_url:sponsor.logo,website:sponsor.website || '',order:sponsor.order_position || 0,period:existing?.period || 'previous',enabled:existing?.enabled !== false,...patch};
  const remaining = records.filter(record=>record.id!==existing?.id && record.sponsor_id!==sponsor.id);
  if (patch.period === 'current') {
    if (existing?.edition_year && existing.edition_year < currentYear) {
      const archiveId = `archive-${existing.id}-${existing.edition_year}`;
      if (!remaining.some(record => record.id === archiveId)) {
        const { sponsor_id: originalId, ...snapshot } = existing;
        remaining.push({ ...snapshot, id: archiveId, name: snapshot.name || sponsor.name, logo_url: snapshot.logo_url || sponsor.logo, archived_sponsor_id: originalId || sponsor.id, featured: existing.featured ?? sponsor.featured === true, period: 'previous' });
      }
    }
    next.edition_year = currentYear;
  } else if (next.period === 'current' && !next.edition_year) next.edition_year = currentYear;
  return [...remaining,next];
}
/** One catalog powers both pages; JSON stores edition/visibility and retains legacy logos only. */
export function resolvePartnerCatalog(sponsors: Sponsor[], value: unknown, currentYear = Number(BRAND_YEAR)): DisplayPartner[] {
  sponsors=(Array.isArray(sponsors)?sponsors:[]).filter(sponsor=>sponsor&&typeof sponsor==='object').map(sponsor=>({...sponsor,name:textValue(sponsor.name),logo:textValue(sponsor.logo)}));
  const records=readHomepagePartners(value);
  const catalog:DisplayPartner[]=sponsors.flatMap(sponsor=>{
    const placement=sponsorPlacement(sponsor,records);
    if(placement?.enabled===false || !sponsor.name.trim() || !sponsor.logo.trim() || (placement?.period === 'current' && placement.edition_year && placement.edition_year > currentYear))return [];
    const period = partnerPlacementPeriod(placement, currentYear);
    const editionYear = placement?.edition_year || (period === 'current' ? currentYear : undefined);
    return [{...sponsor,website:partnerWebsite(sponsor.website),period,...(editionYear ? {edition_year:editionYear} : {}),...(placement?.partner_category ? {partner_category:placement.partner_category} : {})}];
  });
  const legacy:DisplayPartner[]=records.filter(record=>!record.sponsor_id && !sponsors.some(sponsor=>sponsorPlacement(sponsor,records)?.id===record.id) && record.enabled && record.name.trim() && record.logo_url.trim() && !(record.period === 'current' && record.edition_year && record.edition_year > currentYear)).map((record,index)=>({id:-100000-index,name:record.name,logo:record.logo_url,website:partnerWebsite(record.website),description:'',category:'Partners',created_at:'',updated_at:null,featured:record.featured !== false,order_position:record.order,period:partnerPlacementPeriod(record,currentYear),...(record.edition_year ? {edition_year:record.edition_year} : record.period === 'current' ? {edition_year:currentYear} : {}),...(record.partner_category ? {partner_category:record.partner_category} : {})}));
  const seen=new Set<string>();
  return [...catalog,...legacy].filter(partner=>{const key=`${partner.period}|${partner.edition_year || ''}|${partner.name.trim().toLowerCase()}|${partner.logo.trim()}`;if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>Number(a.order_position || 0)-Number(b.order_position || 0));
}
export function resolveHomepagePartners(sponsors: Sponsor[], value: unknown, options:{featuredOnly?:boolean;currentYear?:number}={}): { period: 'previous' | 'current'; partners: DisplayPartner[] } {
  const all=resolvePartnerCatalog(sponsors,value,options.currentYear);
  const period=all.some(partner=>partner.period==='current')?'current':'previous';
  const partners=all.filter(partner=>partner.period===period && (!options.featuredOnly || partner.featured===true));
  return {period,partners};
}
export function indiaDayKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year','month','day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}
export function eventDayKey(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T12:00:00Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== text ? null : text;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : indiaDayKey(date);
}
/** Today's events first, then upcoming dates. Registration count breaks same-day ties. */
export function selectHomepageEvents(events: Event[], now = new Date(), limit = 6): Event[] {
  const today = indiaDayKey(now);
  return (Array.isArray(events) ? events : []).filter(event => event && event.visible !== false).map(event => ({ event, day: eventDayKey(event.date) })).filter(({ day }) => day == null || day >= today).sort((a,b) => {
    const dayOrder = (a.day || '9999-12-31').localeCompare(b.day || '9999-12-31');
    return dayOrder || Math.max(0, Number(b.event.current_registrations) || 0) - Math.max(0, Number(a.event.current_registrations) || 0) || a.event.id - b.event.id;
  }).slice(0, Math.max(0, limit)).map(({ event }) => event);
}
