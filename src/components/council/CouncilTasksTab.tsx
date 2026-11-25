import React, { useState, useMemo } from 'react';
import {
  CheckCircle2, Clock, AlertCircle, Plus, Trash2,
  Filter, CheckSquare, Calendar, User, Users, X, Loader2, Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface CouncilTask {
  id: string;
  title: string;
  description: string | null;
  team: string;
  assignee_name: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouncilCommittee {
  id: number;
  name: string;
  color?: string;
  enabled?: boolean;
}

export interface CouncilTeamMember {
  id: string;
  name: string;
  role?: string;
  committee_id?: number | null;
}

interface CouncilTasksTabProps {
  tasks: CouncilTask[];
  onRefresh: () => Promise<void>;
  councilToken: string;
  committees?: CouncilCommittee[];
  teamMembers?: CouncilTeamMember[];
}

const PRESET_TEAMS = [
  'Technical Team',
  'Web Development',
  'Creative Team',
  'Event Management',
  'Marketing Team',
  'Registration Team',
  'Sponsorship Team',
  'Content Team',
  'Security Team',
  'Media Team',
  'Logistics Team'
];

export const CouncilTasksTab: React.FC<CouncilTasksTabProps> = ({
  tasks,
  onRefresh,
  councilToken,
  committees = [],
  teamMembers = []
}) => {
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<CouncilTask | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Dynamic teams connected to Admin -> Rico Family (core_committees)
  const availableTeams = useMemo(() => {
    const list: string[] = [];
    if (committees && committees.length > 0) {
      committees.forEach(c => {
        if (c.name && !list.includes(c.name)) list.push(c.name);
      });
    }
    // Also include teams from historical tasks so they are never hidden
    tasks.forEach(t => {
      if (t.team && !list.includes(t.team)) list.push(t.team);
    });
    if (list.length === 0) {
      return PRESET_TEAMS;
    }
    return list;
  }, [committees, tasks]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [team, setTeam] = useState('');
  const [customTeam, setCustomTeam] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');

  // Keep default team in sync with available teams
  React.useEffect(() => {
    if (!team && availableTeams.length > 0) {
      setTeam(availableTeams[0]);
    }
  }, [availableTeams, team]);

  // Stats
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filterTeam !== 'all' && task.team !== filterTeam) return false;
      if (filterStatus !== 'all' && task.status !== filterStatus) return false;
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, filterTeam, filterStatus, filterPriority]);

  const handleStatusChange = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    setUpdatingId(taskId);
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'task-update-status',
          payload: { id: taskId, status: newStatus }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update status');
      toast.success(`Task moved to ${newStatus.replace('_', ' ')}`);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Status update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!window.confirm(`Delete task "${taskTitle}"?`)) return;
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'task-delete',
          payload: { id: taskId }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete task');
      toast.success('Task removed');
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTeam = team === 'custom' ? customTeam.trim() : team;
    if (!title.trim() || !finalTeam) {
      toast.error('Task title and team are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'task-create',
          payload: {
            title: title.trim(),
            description: description.trim() || null,
            team: finalTeam,
            assignee_name: assigneeName.trim() || null,
            priority,
            due_date: dueDate || null
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create task');
      toast.success('New task assigned!');
      setShowAddModal(false);
      setTitle('');
      setDescription('');
      setAssigneeName('');
      setDueDate('');
      setPriority('medium');
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Task creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title.trim() || !editingTask.team) {
      toast.error('Task title and team are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'task-update',
          payload: {
            id: editingTask.id,
            title: editingTask.title.trim(),
            description: editingTask.description?.trim() || null,
            team: editingTask.team,
            assignee_name: editingTask.assignee_name?.trim() || null,
            priority: editingTask.priority,
            due_date: editingTask.due_date || null,
            status: editingTask.status
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update task');
      toast.success('Task updated successfully!');
      setEditingTask(null);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider animate-pulse">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/20 text-gray-300 border border-gray-500/30 uppercase tracking-wider">Low</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
          <div className="text-gray-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
            Total Tasks
          </div>
          <div className="text-2xl font-black text-white">{totalCount}</div>
        </div>
        <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
          <div className="text-gray-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            Pending
          </div>
          <div className="text-2xl font-black text-amber-300">{pendingCount}</div>
        </div>
        <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
          <div className="text-gray-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            In Progress
          </div>
          <div className="text-2xl font-black text-cyan-300">{inProgressCount}</div>
        </div>
        <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
          <div className="text-gray-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Completed
          </div>
          <div className="text-2xl font-black text-emerald-300">{completedCount} <span className="text-xs text-gray-500 font-normal">({completionPercentage}%)</span></div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-2xl flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400 font-medium">Overall Execution Progress</span>
          <span className="text-cyan-400 font-bold">{completionPercentage}% Completed</span>
        </div>
        <div className="h-2 w-full bg-gray-950 rounded-full overflow-hidden p-0.5 border border-gray-800">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Action & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-900/50 border border-gray-800 p-3 md:p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 flex items-center gap-1 font-semibold pl-1">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </span>
          <select
            value={filterTeam}
            onChange={e => setFilterTeam(e.target.value)}
            className="bg-black/60 border border-gray-700 text-xs text-gray-300 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Teams</option>
            {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-black/60 border border-gray-700 text-xs text-gray-300 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="bg-black/60 border border-gray-700 text-xs text-gray-300 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs md:text-sm px-4 py-2 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Assign New Task
        </button>
      </div>

      {/* Task List Cards */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 bg-gray-900/20 border border-gray-800/80 rounded-2xl text-gray-500">
            <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No tasks found matching current filters.</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const isCompleted = task.status === 'completed';
            const isInProgress = task.status === 'in_progress';

            return (
              <div
                key={task.id}
                className={`bg-gray-900/50 border rounded-2xl p-4 md:p-5 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCompleted
                    ? 'border-gray-800/60 opacity-75 bg-black/30'
                    : task.priority === 'urgent'
                    ? 'border-rose-500/40 shadow-sm shadow-rose-950/30'
                    : 'border-gray-800 hover:border-gray-700 hover:bg-gray-900/70'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getPriorityBadge(task.priority)}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                      <Users className="w-2.5 h-2.5" />
                      {task.team}
                    </span>
                    {task.assignee_name && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-gray-300 border border-white/10 flex items-center gap-1">
                        <User className="w-2.5 h-2.5 text-cyan-400" />
                        {task.assignee_name}
                      </span>
                    )}
                    {task.due_date && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-gray-400 border border-white/10 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        Due: {task.due_date}
                      </span>
                    )}
                  </div>

                  <h3 className={`text-base font-bold text-white transition-all ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-xs text-gray-400 leading-relaxed max-w-3xl">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Actions & Status Dropdown */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-gray-800">
                    <button
                      disabled={updatingId === task.id}
                      onClick={() => handleStatusChange(task.id, 'pending')}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
                        task.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 shadow'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      disabled={updatingId === task.id}
                      onClick={() => handleStatusChange(task.id, 'in_progress')}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
                        isInProgress
                          ? 'bg-cyan-500/20 text-cyan-300 shadow'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      disabled={updatingId === task.id}
                      onClick={() => handleStatusChange(task.id, 'completed')}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 shadow'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Done
                    </button>
                  </div>

                  <button
                    onClick={() => setEditingTask(task)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                    title="Edit task"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteTask(task.id, task.title)}
                    className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/20"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Assign Team Task
            </h2>
            <p className="text-xs text-gray-400 mb-6">Create and delegate an actionable task to any festival team.</p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Task Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Arrange line-array speakers for EDM night"
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Assigned Team *</label>
                  <select
                    value={team}
                    onChange={e => setTeam(e.target.value)}
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="custom">+ Other / Custom Team</option>
                  </select>
                </div>

                {team === 'custom' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Custom Team Name</label>
                    <input
                      type="text"
                      required
                      value={customTeam}
                      onChange={e => setCustomTeam(e.target.value)}
                      placeholder="Enter team name"
                      className="w-full bg-black/60 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Priority Level</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Assignee / Lead</label>
                  <input
                    type="text"
                    list="team-members-list"
                    value={assigneeName}
                    onChange={e => setAssigneeName(e.target.value)}
                    placeholder="e.g., Select from team or type name"
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                  <datalist id="team-members-list">
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.name}>{m.role ? `${m.name} (${m.role})` : m.name}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Details & Instructions</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Key deliverables, contact persons, vendor details..."
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setEditingTask(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-400" />
              Edit Task
            </h2>
            <p className="text-xs text-gray-400 mb-6">Modify task assignment, priority, or details.</p>

            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Task Title *</label>
                <input
                  type="text"
                  required
                  value={editingTask.title}
                  onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Assigned Team *</label>
                  <select
                    value={editingTask.team}
                    onChange={e => setEditingTask({ ...editingTask, team: e.target.value })}
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Assignee Name</label>
                  <input
                    type="text"
                    list="team-members-list"
                    value={editingTask.assignee_name || ''}
                    onChange={e => setEditingTask({ ...editingTask, assignee_name: e.target.value })}
                    placeholder="e.g., Select from team or type name"
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={e => setEditingTask({ ...editingTask, priority: e.target.value as any })}
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Status</label>
                  <select
                    value={editingTask.status}
                    onChange={e => setEditingTask({ ...editingTask, status: e.target.value as any })}
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={editingTask.due_date || ''}
                    onChange={e => setEditingTask({ ...editingTask, due_date: e.target.value })}
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Details & Instructions</label>
                <textarea
                  rows={3}
                  value={editingTask.description || ''}
                  onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
