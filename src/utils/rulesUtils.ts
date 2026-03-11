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
 * Checks if a rules string is actually a JSON representation of StructuredRules
 */
export function isStructuredRules(rules: string): boolean {
  if (!rules) return false;
  try {
    const parsed = JSON.parse(rules);
    return Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].heading === 'string';
  } catch (e) {
    return false;
  }
}

/**
 * Unpacks JSON rules into RuleSection array
 */
export function unpackStructured(rules: string): RuleSection[] {
  try {
    return JSON.parse(rules);
  } catch (e) {
    return [];
  }
}

/**
 * Packs RuleSection array into JSON string
 */
export function packStructured(sections: RuleSection[]): string {
  return JSON.stringify(sections);
}
