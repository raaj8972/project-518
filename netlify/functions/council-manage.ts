import type { Handler } from '@netlify/functions';
import { getSupabaseClient } from './lib/supabase';
import { trustedClientIp } from './lib/client-ip';
import { parseCookie, verifyCouncilSessionToken, getCouncilLogoutCookieHeader } from './lib/council-session';

export const handler: Handler = async event => {
  const reply = (statusCode: number, body: unknown, extraHeaders: Record<string, string> = {}) => ({
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders
    },
    body: JSON.stringify(statusCode >= 500 ? { error: 'Council service unavailable. Please try again.' } : body)
  });

  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, payload } = body;

    // Handle logout action immediately to clear the session cookie
    if (action === 'logout') {
      return reply(200, { success: true }, {
        'Set-Cookie': getCouncilLogoutCookieHeader()
      });
    }

    const client = getSupabaseClient(true);
    const ip = trustedClientIp(event.headers);

    // Rate Limiting Guard
    const { data: limit, error: limitError } = await client.rpc('check_rate_limit', { request_ip: ip });
    if (limitError || !limit || typeof limit.allowed !== 'boolean') return reply(503, { error: 'Request protection unavailable' });
    if (!limit.allowed) {
      return reply(429, { error: 'Too many attempts. Please try again later.' });
    }

    // Only a session issued by the rate-limited login endpoint authorizes access.
    const cookieHeader = event.headers.cookie || event.headers.Cookie;
    const cookieToken = parseCookie(cookieHeader, 'council_session');
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const bearerCandidate = authHeader.replace(/^Bearer\s+/i, '').trim();
    const bodyToken = typeof body.councilToken === 'string' ? body.councilToken.trim() : '';
    let verifiedPasscode = verifyCouncilSessionToken(cookieToken || bearerCandidate || bodyToken);

    // A sealed session proves issuance, not continued permission. Recheck the
    // current password/enabled setting before service-role reads or writes.
    if (verifiedPasscode) {
      const { data: valid, error } = await client.rpc('verify_council_password', { p_password: verifiedPasscode });
      if (error) return reply(503, { error: 'Council authorization unavailable' });
      if (valid !== true) verifiedPasscode = null;
    }

    if (!verifiedPasscode) {
      await client.rpc('record_failed_attempt', { request_ip: ip });
      return reply(401, { error: 'Invalid council credentials or expired session' });
    }

    switch (action) {
      // --- DASHBOARD STATS & VIP ---
      case 'get-stats': {
        const { data, error } = await client.rpc('get_council_dashboard_stats_v3', { p_password: verifiedPasscode });
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true, stats: data });
      }

      case 'get-vip-passes': {
        const { data, error } = await client.rpc('get_council_vip_passes_v3', { p_password: verifiedPasscode });
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true, passes: data || [] });
      }

      case 'create-vip': {
        const { name, notes, validDate } = payload || {};
        const { data, error } = await client.rpc('create_vip_pass_v3', {
          p_council_password: verifiedPasscode,
          p_name: name || null,
          p_notes: notes || null,
          p_valid_date: validDate || null
        });
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true, pass: data });
      }

      case 'delete-vip': {
        const { id } = payload || {};
        if (!id) return reply(400, { error: 'Pass id required' });
        const { error } = await client.rpc('delete_entry_pass_v3', {
          p_council_password: verifiedPasscode,
          p_pass_id: id
        });
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true });
      }

      // --- SUITE READ ---
      case 'get-all': {
        const [tasksRes, announcementsRes, budgetsRes, expensesRes, sponsorsRes, committeesRes, membersRes] = await Promise.all([
          client.from('council_tasks').select('*').order('created_at', { ascending: false }),
          client.from('council_announcements').select('*').order('published_at', { ascending: false }),
          client.from('council_budgets').select('*').order('allocated_amount', { ascending: false }),
          client.from('council_expenses').select('*').order('created_at', { ascending: false }),
          client.from('council_sponsors').select('*').order('committed_amount', { ascending: false }),
          client.from('core_committees').select('id, name, color, enabled, order_position').eq('enabled', true).order('order_position', { ascending: true }),
          client.from('core_team_members').select('id, name, role, committee_id').order('name', { ascending: true })
        ]);

        return reply(200, {
          success: true,
          tasks: tasksRes.data || [],
          announcements: announcementsRes.data || [],
          budgets: budgetsRes.data || [],
          expenses: expensesRes.data || [],
          sponsors: sponsorsRes.data || [],
          committees: committeesRes.data || [],
          teamMembers: membersRes.data || []
        });
      }

      // --- TASKS ---
      case 'task-create': {
        const { title, description, team, assignee_name, priority, due_date } = payload || {};
        if (!title || !team) return reply(400, { error: 'Title and Team are required' });
        const { data, error } = await client.from('council_tasks').insert([{
          title: title.trim(),
          description: description?.trim() || null,
          team: team.trim(),
          assignee_name: assignee_name?.trim() || null,
          priority: priority || 'medium',
          status: 'pending',
          due_date: due_date || null
        }]).select().single();
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true, task: data });
      }

      case 'task-update': {
        const { id, title, description, team, assignee_name, priority, due_date, status } = payload || {};
        if (!id) return reply(400, { error: 'Task id required' });
        const updates: any = { updated_at: new Date().toISOString() };
        if (title) updates.title = title.trim();
        if (description !== undefined) updates.description = description ? description.trim() : null;
        if (team) updates.team = team.trim();
        if (assignee_name !== undefined) updates.assignee_name = assignee_name ? assignee_name.trim() : null;
        if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) updates.priority = priority;
        if (due_date !== undefined) updates.due_date = due_date || null;
        if (status && ['pending', 'in_progress', 'completed'].includes(status)) updates.status = status;
        const { data, error } = await client.from('council_tasks').update(updates).eq('id', id).select().single();
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true, task: data });
      }

      case 'task-update-status': {
        const { id, status } = payload || {};
        if (!id || !['pending', 'in_progress', 'completed'].includes(status)) {
          return reply(400, { error: 'Valid id and status required' });
        }
        const { data, error } = await client.from('council_tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true, task: data });
      }

      case 'task-delete': {
        const { id } = payload || {};
        if (!id) return reply(400, { error: 'Task id required' });
        const { error } = await client.from('council_tasks').delete().eq('id', id);
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true });
      }

      // --- ANNOUNCEMENTS ---
      case 'announcement-create': {
        const { title, content, target_audience, is_urgent } = payload || {};
        if (!title || !content) return reply(400, { error: 'Title and content are required' });
        const { data, error } = await client.from('council_announcements').insert([{
          title: title.trim(),
          content: content.trim(),
          target_audience: target_audience || 'all',
          is_urgent: Boolean(is_urgent),
          is_published: true,
          published_at: new Date().toISOString()
        }]).select().single();
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true, announcement: data });
      }

      case 'announcement-update': {
        const { id, title, content, target_audience, is_urgent, is_published } = payload || {};
        if (!id) return reply(400, { error: 'Announcement id required' });
        const updates: any = { updated_at: new Date().toISOString() };
        if (title) updates.title = title.trim();
        if (content) updates.content = content.trim();
        if (target_audience) updates.target_audience = target_audience;
        if (is_urgent !== undefined) updates.is_urgent = Boolean(is_urgent);
        if (is_published !== undefined) updates.is_published = Boolean(is_published);
        const { data, error } = await client.from('council_announcements').update(updates).eq('id', id).select().single();
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true, announcement: data });
      }

      case 'announcement-toggle': {
        const { id, is_published } = payload || {};
        if (!id) return reply(400, { error: 'Announcement id required' });
        const { data, error } = await client.from('council_announcements').update({ is_published: Boolean(is_published), updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true, announcement: data });
      }

      case 'announcement-delete': {
        const { id } = payload || {};
        if (!id) return reply(400, { error: 'Announcement id required' });
        const { error } = await client.from('council_announcements').delete().eq('id', id);
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true });
      }

      // --- BUDGETS ---
      case 'budget-create': {
        const { committee_id, allocated_amount, notes } = payload || {};
        if (!committee_id || allocated_amount === undefined) return reply(400, { error: 'Committee and allocated amount required' });
        const { data, error } = await client.from('council_budgets').insert([{
          committee_id,
          allocated_amount: Number(allocated_amount),
          notes: notes?.trim() || null
        }]).select().single();
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true, budget: data });
      }

      case 'budget-update': {
        const { id, allocated_amount, notes } = payload || {};
        if (!id || allocated_amount === undefined) return reply(400, { error: 'Budget id and allocated amount required' });
        const { data, error } = await client.from('council_budgets').update({
          allocated_amount: Number(allocated_amount),
          notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
          updated_at: new Date().toISOString()
        }).eq('id', id).select().single();
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true, budget: data });
      }

      case 'budget-delete': {
        const { id } = payload || {};
        if (!id) return reply(400, { error: 'Budget id required' });
        const { error } = await client.from('council_budgets').delete().eq('id', id);
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true });
      }

      // --- EXPENSES ---
      case 'expense-create': {
        const { budget_id, committee_id, title, amount, receipt_url, spent_by, spent_at } = payload || {};
        if (!title || amount === undefined) return reply(400, { error: 'Title and amount required' });
        const { data, error } = await client.from('council_expenses').insert([{
          budget_id: budget_id || null,
          committee_id: committee_id || null,
          title: title.trim(),
          amount: Number(amount),
          receipt_url: receipt_url?.trim() || null,
          spent_by: spent_by?.trim() || null,
          spent_at: spent_at || new Date().toISOString()
        }]).select().single();
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true, expense: data });
      }

      case 'expense-update': {
        const { id, title, amount, receipt_url, spent_by, spent_at, committee_id } = payload || {};
        if (!id) return reply(400, { error: 'Expense id required' });
        const updates: any = {};
        if (title) updates.title = title.trim();
        if (amount !== undefined) updates.amount = Number(amount);
        if (receipt_url !== undefined) updates.receipt_url = receipt_url ? receipt_url.trim() : null;
        if (spent_by !== undefined) updates.spent_by = spent_by ? spent_by.trim() : null;
        if (spent_at) updates.spent_at = spent_at;
        if (committee_id !== undefined) updates.committee_id = committee_id || null;
        const { data, error } = await client.from('council_expenses').update(updates).eq('id', id).select().single();
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true, expense: data });
      }

      case 'expense-delete': {
        const { id } = payload || {};
        if (!id) return reply(400, { error: 'Expense id required' });
        const { error } = await client.from('council_expenses').delete().eq('id', id);
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true });
      }

      // --- SPONSORS ---
      case 'sponsor-create': {
        const { name, tier, status, committed_amount, received_amount, contact_person, contact_phone, contact_email, deliverables, deliverables_status, notes } = payload || {};
        if (!name) return reply(400, { error: 'Sponsor name is required' });
        const { data, error } = await client.from('council_sponsors').insert([{
          name: name.trim(),
          tier: tier || 'co_sponsor',
          status: status || 'discussion',
          committed_amount: Number(committed_amount || 0),
          received_amount: Number(received_amount || 0),
          contact_person: contact_person?.trim() || null,
          contact_phone: contact_phone?.trim() || null,
          contact_email: contact_email?.trim() || null,
          deliverables: deliverables?.trim() || null,
          deliverables_status: deliverables_status || 'pending',
          notes: notes?.trim() || null
        }]).select().single();
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true, sponsor: data });
      }

      case 'sponsor-update': {
        const { id, updates } = payload || {};
        if (!id || !updates) return reply(400, { error: 'Sponsor id and updates required' });
        const { data, error } = await client.from('council_sponsors').update({
          ...updates,
          updated_at: new Date().toISOString()
        }).eq('id', id).select().single();
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true, sponsor: data });
      }

      case 'sponsor-delete': {
        const { id } = payload || {};
        if (!id) return reply(400, { error: 'Sponsor id required' });
        const { error } = await client.from('council_sponsors').delete().eq('id', id);
        if (error) return reply(500, { error: error.message });
        return reply(200, { success: true });
      }

      default:
        return reply(400, { error: 'Unknown action' });
    }
  } catch (err: any) {
    return reply(500, { error: err.message || 'Council service failure' });
  }
};
