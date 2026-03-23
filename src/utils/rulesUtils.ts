export const STRUCTURED_MARK = '__SR__';

export interface RuleBlock {
  kind: 'text' | 'points';
  style?: 'bullet' | 'number';
  title?: string;
  content?: string;
  items?: string[];
}

export interface RuleSection {
  heading: string;
  blocks: RuleBlock[];
}

/**
 * Checks if a rules value (string or array) is structured
 */
export function isStructuredRules(rules: string[] | string | null | undefined): boolean {
  if (!rules) return false;
  
  // Format 1: Array of strings where first element has marker (used in Events.tsx)
  if (Array.isArray(rules)) {
    return rules.length === 1 && typeof rules[0] === 'string' && rules[0].startsWith(STRUCTURED_MARK);
  }
  
  // Format 2: Direct JSON string (used in older logic)
  if (typeof rules === 'string') {
    try {
      const parsed = JSON.parse(rules);
      return Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].heading === 'string';
    } catch (e) {
      return false;
    }
  }
  
  return false;
}

/**
 * Unpacks structured rules from string or array
 */
export function unpackStructured(rules: string[] | string | null | undefined): RuleSection[] {
  if (!rules) return [];
  
  try {
    if (Array.isArray(rules)) {
      if (rules.length === 0) return [];
      const content = rules[0];
      if (content.startsWith(STRUCTURED_MARK)) {
        return JSON.parse(content.slice(STRUCTURED_MARK.length));
      }
      return [];
    }
    
    if (typeof rules === 'string') {
      return JSON.parse(rules);
    }
  } catch (e) {
    console.error('Error unpacking rules:', e);
  }
  
  return [];
}

/**
 * Computes human-readable count of rules
 */
export function computeRulesCount(rules: string[] | string | null | undefined): number {
  if (!rules || (Array.isArray(rules) && rules.length === 0)) return 0;

  if (isStructuredRules(rules)) {
    const sections = unpackStructured(rules);
    return sections.reduce((acc, section) => {
      return acc + section.blocks.reduce((bAcc, block) => {
        if (block.kind === 'points' && block.items) return bAcc + block.items.length;
        if (block.kind === 'text') return bAcc + 1;
        return bAcc;
      }, 0);
    }, 0);
  }

  // Fallback for simple array of strings
  if (Array.isArray(rules)) {
    return rules.filter((r) => !!String(r).trim()).length;
  }
  
  return 0;
}

/**
 * Packs RuleSection array into the marked string format
 */
export function packStructured(sections: RuleSection[]): string {
  return STRUCTURED_MARK + JSON.stringify(sections);
}
