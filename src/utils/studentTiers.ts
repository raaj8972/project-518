export type StudentTier = 'bronze' | 'silver' | 'gold' | 'elite';

// These thresholds match award_xp. Platinum is an older name for the top tier.
export const STUDENT_TIERS = [
  { id: 'bronze', label: 'Bronze', minimumXP: 0, color: '#ca946c' },
  { id: 'silver', label: 'Silver', minimumXP: 100, color: '#c0cdc4' },
  { id: 'gold', label: 'Gold', minimumXP: 500, color: '#dec283' },
  { id: 'elite', label: 'Elite', minimumXP: 1000, color: '#b7d69a' },
] as const;

export function studentTier(value?: string | null) {
  const name = value?.trim().toLowerCase();
  return STUDENT_TIERS.find(tier => tier.id === (name === 'platinum' ? 'elite' : name)) || STUDENT_TIERS[0];
}

export function studentTierProgress(xp: number, value?: string) {
  const total = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const earned = [...STUDENT_TIERS].reverse().find(tier => total >= tier.minimumXP)!;
  const saved = studentTier(value);
  const tier = value ? saved : earned;
  const index = STUDENT_TIERS.findIndex(item => item.id === tier.id);
  const next = STUDENT_TIERS[index + 1];
  return {
    tier, level: index + 1,
    percent: next ? Math.max(0, Math.min(100, ((total - tier.minimumXP) / (next.minimumXP - tier.minimumXP)) * 100)) : 100,
  };
}
