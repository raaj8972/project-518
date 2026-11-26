import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Crown,
  Loader2,
  Plus,
  QrCode,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react';
import { dualDelete, dualInsert, dualRead, dualUpdate } from '../../../lib/dualDb';
import { useToast } from '../../ToastProvider';
import { DEFAULT_RULES, type ValidationRule } from '../../../utils/validationRules';
import { ConfirmDialog } from './EntryPassDialog';

export const ValidationRulesPanel: React.FC = () => {
  const { push: toast } = useToast();

  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [targetFilter, setTargetFilter] = useState<'all' | 'vip' | 'student'>('all');
  const [confirmDelete, setConfirmDelete] = useState<ValidationRule | null>(null);

  const filterAllowedTypes = (list: ValidationRule[]) =>
    list.filter((r) => r.rule_type === 'time_window' || r.rule_type === 'capacity');

  const loadRules = async () => {
    setLoading(true);
    try {
      const { data } = await dualRead({
        table: 'validation_rules',
        order: ['priority', { ascending: false }],
      });
      const source = data && data.length > 0 ? data : DEFAULT_RULES;
      setRules(filterAllowedTypes(source));
      setTableReady(true);
    } catch {
      setRules(filterAllowedTypes(DEFAULT_RULES));
      setTableReady(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleToggle = async (rule: ValidationRule) => {
    if (!tableReady) {
      toast({ message: 'Rules table is not ready yet', type: 'error' });
      return;
    }
    const updated = { ...rule, is_active: !rule.is_active };
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    try {
      await dualUpdate('validation_rules', updated.id, updated);
      toast({ message: updated.is_active ? 'Rule turned ON' : 'Rule turned OFF', type: 'success' });
    } catch {
      toast({ message: 'Could not save rule status', type: 'error' });
      loadRules();
    }
  };

  const handleUpdatePassType = async (rule: ValidationRule, passType: 'vip' | 'student') => {
    if (!tableReady) return;
    const updated = { ...rule, pass_type: passType };
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    try {
      await dualUpdate('validation_rules', updated.id, updated);
      toast({
        message: `Rule set for ${passType === 'vip' ? 'VIP Pass' : 'Student Pass'}`,
        type: 'success',
      });
    } catch {
      toast({ message: 'Could not update pass type', type: 'error' });
      loadRules();
    }
  };

  const handleUpdateConfig = async (ruleId: string, nextConfig: any) => {
    if (!tableReady) return;
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const updated = { ...rule, config: nextConfig };
    setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));
    try {
      await dualUpdate('validation_rules', updated.id, updated);
      toast({ message: 'Rule updated', type: 'success' });
    } catch {
      toast({ message: 'Could not save rule changes', type: 'error' });
      loadRules();
    }
  };

  const handleCreate = async (
    type: 'time_window' | 'capacity',
    passType: 'vip' | 'student'
  ) => {
    if (!tableReady) return;
    const labelPrefix = passType === 'vip' ? 'VIP' : 'Student';
    const inserted: ValidationRule = {
      id: `rule_${Date.now()}`,
      rule_name:
        type === 'time_window'
          ? `${labelPrefix} Entry Time Window`
          : `${labelPrefix} Capacity Limit`,
      rule_type: type,
      pass_type: passType,
      config:
        type === 'time_window'
          ? { startTime: '16:00', endTime: '22:00' }
          : { maxCapacity: passType === 'vip' ? 200 : 1200 },
      is_active: false,
      priority: 10,
    };
    try {
      await dualInsert('validation_rules', inserted);
      setRules((prev) => [inserted, ...prev]);
      toast({ message: `${inserted.rule_name} added`, type: 'success' });
    } catch (err: any) {
      toast({ message: err.message || 'Could not add rule', type: 'error' });
    }
  };

  const handleDelete = async (rule: ValidationRule) => {
    try {
      await dualDelete('validation_rules', rule.id);
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      toast({ message: 'Rule deleted', type: 'success' });
    } catch (err: any) {
      toast({ message: err.message || 'Could not delete rule', type: 'error' });
    } finally {
      setConfirmDelete(null);
    }
  };

  const visibleRules = rules.filter((r) => {
    if (targetFilter === 'all') return true;
    return (r.pass_type || 'vip') === targetFilter;
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header & separate VIP / Student quick add */}
      <div className="bg-white border border-[#e2e8df] rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#26352e]">Gate Time & Capacity Rules</h2>
            <p className="text-xs text-[#65726a] mt-0.5">
              Set separate entry times and max crowd limits for VIP Passes and Student Passes. Date checking already runs automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRules}
            disabled={loading}
            aria-label="Refresh rules"
            className="h-9 w-9 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-[#65726a] inline-flex items-center justify-center shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-[#eef2ec]">
          {/* Filter pills */}
          <div className="inline-flex items-center gap-1 bg-[#fafbf9] border border-[#e2e8df] rounded-lg p-1 self-start">
            {(
              [
                { id: 'all', label: 'All rules' },
                { id: 'vip', label: 'VIP only' },
                { id: 'student', label: 'Student only' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTargetFilter(f.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  targetFilter === f.id
                    ? 'bg-white text-[#26352e] shadow-sm border border-[#e2e8df]'
                    : 'text-[#65726a] hover:text-[#26352e]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Add Time / Capacity separately for VIP or Student */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleCreate('time_window', targetFilter === 'student' ? 'student' : 'vip')
              }
              className="h-9 px-3 rounded-lg border border-[#e2e8df] bg-white hover:bg-[#f6f8f4] text-xs font-medium text-[#26352e] inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#426b52]" />
              {targetFilter === 'student' ? 'Student Time' : 'VIP Time'}
            </button>
            <button
              type="button"
              onClick={() =>
                handleCreate('capacity', targetFilter === 'student' ? 'student' : 'vip')
              }
              className="h-9 px-3 rounded-lg bg-[#426b52] hover:bg-[#365a44] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {targetFilter === 'student' ? 'Student Capacity' : 'VIP Capacity'}
            </button>
          </div>
        </div>
      </div>

      {!tableReady && (
        <div className="bg-[#fef3c7] border border-[#f5d07a] rounded-xl p-4 flex items-start gap-3 text-xs text-[#92400e]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Could not sync gate rules from Supabase</p>
            <p className="mt-0.5">Showing default rules. Tap refresh to try again.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-[#e2e8df] rounded-xl py-16 text-center text-xs text-[#65726a]">
          <Loader2 className="w-6 h-6 text-[#426b52] animate-spin mx-auto mb-2" />
          Loading gate rules...
        </div>
      ) : visibleRules.length === 0 ? (
        <div className="bg-white border border-[#e2e8df] rounded-xl py-16 px-4 text-center text-xs text-[#65726a]">
          <Clock className="w-8 h-8 text-[#a3b0a7] mx-auto mb-2" />
          <p className="font-medium text-[#26352e]">No time or capacity rules added yet</p>
          <p className="text-xs text-[#65726a] mt-0.5">
            Use the buttons above to add separate entry time or capacity rules for VIP or Student passes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleRules.map((rule) => {
            const isVip = (rule.pass_type || 'vip') === 'vip';
            const Icon = rule.rule_type === 'time_window' ? Clock : Users;

            return (
              <div
                key={rule.id}
                className={`bg-white border rounded-xl p-4 space-y-4 transition-opacity ${
                  rule.is_active ? 'border-[#cde0cb]' : 'border-[#e2e8df] opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        rule.is_active
                          ? 'bg-[#eff4ed] text-[#426b52]'
                          : 'bg-[#f3f4f6] text-[#65726a]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#26352e] truncate">
                        {rule.rule_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isVip
                              ? 'bg-[#fef3c7] text-[#92400e]'
                              : 'bg-[#eff4ed] text-[#3d6246]'
                          }`}
                        >
                          {isVip ? (
                            <>
                              <Crown className="w-2.5 h-2.5" /> VIP Pass
                            </>
                          ) : (
                            <>
                              <QrCode className="w-2.5 h-2.5" /> Student Pass
                            </>
                          )}
                        </span>
                        <span className="text-[11px] text-[#65726a]">
                          {rule.rule_type === 'time_window' ? 'Time window' : 'Max limit'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rule.is_active}
                      onClick={() => handleToggle(rule)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                        rule.is_active
                          ? 'bg-[#426b52] text-white'
                          : 'bg-[#f3f4f6] text-[#5c6660] hover:bg-[#e5e7eb]'
                      }`}
                    >
                      {rule.is_active ? 'ON' : 'OFF'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDelete(rule)}
                      aria-label={`Delete ${rule.rule_name}`}
                      className="p-1.5 rounded-lg text-[#8a968e] hover:text-[#b43c48] hover:bg-[#fdf2f3]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Switch between VIP Pass and Student Pass */}
                <div className="flex items-center justify-between pt-3 border-t border-[#eef2ec]">
                  <span className="text-[11px] font-medium text-[#65726a]">Applies to:</span>
                  <div className="inline-flex rounded-lg border border-[#e2e8df] bg-[#fafbf9] p-0.5">
                    <button
                      type="button"
                      onClick={() => handleUpdatePassType(rule, 'vip')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                        isVip ? 'bg-white text-[#92400e] shadow-sm' : 'text-[#65726a]'
                      }`}
                    >
                      VIP Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdatePassType(rule, 'student')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                        !isVip ? 'bg-white text-[#3d6246] shadow-sm' : 'text-[#65726a]'
                      }`}
                    >
                      Student Pass
                    </button>
                  </div>
                </div>

                {rule.rule_type === 'time_window' && (
                  <div className="pt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#65726a] mb-1">
                        Entry starts
                      </label>
                      <input
                        type="time"
                        value={rule.config.startTime || ''}
                        onChange={(e) =>
                          handleUpdateConfig(rule.id, { ...rule.config, startTime: e.target.value })
                        }
                        className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#65726a] mb-1">
                        Entry closes
                      </label>
                      <input
                        type="time"
                        value={rule.config.endTime || ''}
                        onChange={(e) =>
                          handleUpdateConfig(rule.id, { ...rule.config, endTime: e.target.value })
                        }
                        className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e]"
                      />
                    </div>
                  </div>
                )}

                {rule.rule_type === 'capacity' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-medium text-[#65726a] mb-1">
                      Maximum entries allowed ({isVip ? 'VIP' : 'Student'})
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={rule.config.maxCapacity || ''}
                      onChange={(e) =>
                        handleUpdateConfig(rule.id, {
                          ...rule.config,
                          maxCapacity: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full h-9 px-3 text-xs rounded-lg border border-[#e2e8df] bg-[#fafbf9] text-[#26352e]"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          open={true}
          title="Delete gate rule"
          message={`Are you sure you want to delete "${confirmDelete.rule_name}"?`}
          confirmLabel="Delete rule"
          tone="danger"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};
