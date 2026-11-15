import type { CoreTeamMember } from '../types/data';
import { isCouncilPerson } from './familyPeople';

export const COUNCIL_LIGHTS = [
  { id: 'red', label: 'Red', hex: '#f47272', hue: '-55deg' },
  { id: 'blue', label: 'Blue', hex: '#79a9ff', hue: '155deg' },
  { id: 'green', label: 'Green', hex: '#86df99', hue: '65deg' },
  { id: 'yellow', label: 'Yellow', hex: '#f4d76f', hue: '0deg' },
] as const;
export type CouncilLightColor = typeof COUNCIL_LIGHTS[number]['id'];
export type CouncilLightAssignments = Record<CouncilLightColor, number | null>;

export function councilLightColor(value: unknown): CouncilLightColor | null {
  if (value === 'emerald') return 'green';
  if (value === 'amber') return 'yellow';
  return COUNCIL_LIGHTS.some(light => light.id === value) ? value as CouncilLightColor : null;
}

export function councilLightAssignments(people: CoreTeamMember[]): CouncilLightAssignments {
  const result: CouncilLightAssignments = { red: null, blue: null, green: null, yellow: null };
  const sorted = [...people].filter(isCouncilPerson).sort((a, b) => a.order_position - b.order_position || a.id - b.id);
  for (const person of sorted) {
    const color = councilLightColor(person.color);
    if (color && result[color] === null) result[color] = person.id;
  }
  return result;
}

export function councilLightingChanges(people: CoreTeamMember[], assignments: CouncilLightAssignments) {
  const ids = Object.values(assignments).filter(id => id !== null);
  if (new Set(ids).size !== ids.length) throw new Error('Choose a different council member for each light.');
  if (ids.some(id => !people.some(person => person.id === id && isCouncilPerson(person)))) throw new Error('A selected council member is no longer available.');
  return people.filter(isCouncilPerson).flatMap(person => {
    const target = COUNCIL_LIGHTS.find(light => assignments[light.id] === person.id)?.id || null;
    const current = councilLightColor(person.color);
    return current === target ? [] : [{ id: person.id, color: target }];
  });
}
