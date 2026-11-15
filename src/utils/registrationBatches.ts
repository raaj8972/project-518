type BatchSettings={registration_participant_types?:unknown;batch_options?:unknown}|null|undefined;
const defaults=['Batch 2024','Batch 2025','Batch 2026','Batch 2027'];
// Preserve exact stored labels: profile.batch and CR permissions compare them directly.
export function registrationBatches(settings:BatchSettings):string[]{
 const values=(value:unknown)=>Array.isArray(value)?[...new Set(value.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())))]:[];
 const primary=values(settings?.registration_participant_types);
 if(primary.length)return primary;
 const secondary=values(settings?.batch_options);
 return secondary.length?secondary:[...defaults];
}
