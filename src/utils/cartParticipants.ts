export function groupParticipantIds(group: { owner_id: string; members?: Array<{ user_id: string; status: string }> }): string[] {
  return [...new Set([group.owner_id, ...(group.members || []).filter(m => m.status === 'accepted').map(m => m.user_id)])];
}
