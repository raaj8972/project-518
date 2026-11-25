import { supabase } from '../lib/supabase';
export interface CollegeIdentity {
  user_id: string;
  iqmg_number: string | null;
  status: 'pending' | 'verified' | 'correction_required';
  note: string | null;
  verified_at: string | null;
}
export interface TeamPerson {
  user_id: string;
  full_name: string;
  batch: string | null;
  avatar_url: string | null;
  captain: boolean;
}
export interface StudentTeam {
  id: string;
  name: string;
  team_code: string;
  owner_id: string;
  captain_name: string;
  members: TeamPerson[];
}
export interface TeamRequest {
  id: string;
  group_id: string;
  team_code: string;
  team_name: string;
  kind: 'invite' | 'join';
  student_name: string;
  student_batch: string | null;
  captain_name: string;
  incoming: boolean;
  expires_at: string;
}
export interface TeamWorkspace {
  identity: CollegeIdentity | null;
  teams: StudentTeam[];
  requests: TeamRequest[];
}
export interface IQMGStudent {
  id: string;
  full_name: string;
  batch: string | null;
  avatar_url: string | null;
  iqmg_number: string;
}
export interface TeamLookup {
  id: string;
  team_code: string;
  name: string;
  captain_name: string;
  member_count: number;
}
async function rpc<T>(name: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(name, params);
  if (error)
    throw error;
  return data as T;
}
export const getCollegeIdentity = () => rpc<CollegeIdentity | null>('get_my_iqmg_identity');
export const claimCollegeIdentity = (number: string) => rpc<CollegeIdentity>('claim_student_iqmg', { p_number: number });
export const getTeamWorkspace = () => rpc<TeamWorkspace>('get_student_team_workspace');
export const createStudentTeam = (name: string) => rpc<StudentTeam>('create_student_team', { p_name: name });
export const findIQMGStudent = (number: string) => rpc<IQMGStudent | null>('find_student_by_iqmg', { p_number: number });
export const findStudentTeam = (code: string) => rpc<TeamLookup | null>('find_student_team', { p_code: code });
export const inviteIQMGStudent = (group: string, number: string) => rpc<string>('start_student_team_request', { p_group_id: group, p_kind: 'invite', p_iqmg: number });
export const requestTeamJoin = (group: string) => rpc<string>('start_student_team_request', { p_group_id: group, p_kind: 'join', p_iqmg: null });
export const respondTeamRequest = (id: string, accept: boolean) => rpc<void>('respond_student_team_request', { p_request_id: id, p_accept: accept });
export const cancelTeamRequest = (id: string) => rpc<void>('cancel_student_team_request', { p_request_id: id });
export const removeTeamMember = (group: string, user: string) => rpc<void>('remove_student_team_member', { p_group_id: group, p_user_id: user });
export const deleteStudentTeam = (id: string) => rpc<void>('delete_student_team', { p_group_id: id });
export const previewIQMGRoster = (id: string) => rpc<RosterPreview[]>('preview_iqmg_roster', { p_import_id: id });
export const applyIQMGRoster = (id: string, rows: number[]) => rpc<{
  roster_rows: number;
  verified: number;
  corrected_claims: number;
}>('apply_iqmg_roster', { p_import_id: id, p_rows: rows });
export interface RosterPreview {
  row_index: number;
  iqmg_number: string;
  full_name: string;
  batch: string | null;
  matched_user: string | null;
  status: 'matched' | 'ambiguous' | 'invalid' | 'no_account';
  current_claimant: string | null;
}
