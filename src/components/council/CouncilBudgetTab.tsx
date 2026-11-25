import React, { useState, useMemo } from 'react';
import {
  Wallet, CheckCircle2, XCircle,
  Clock, Plus, Trash2, Edit3, Filter, Building,
  Receipt, X, Loader2, Sparkles, ChevronDown, ChevronUp,
  DollarSign, ArrowDownRight, History, Check, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface CouncilBudget {
  id: string;
  department: string;
  allocated_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouncilExpense {
  id: string;
  department: string;
  title: string;
  amount: number;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected';
  bill_url: string | null;
  notes: string | null;
  approved_at: string | null;
  created_at: string;
}

interface CouncilBudgetTabProps {
  budgets: CouncilBudget[];
  expenses: CouncilExpense[];
  onRefresh: () => Promise<void>;
  councilToken: string;
  committees?: { id: number; name: string; color?: string; enabled?: boolean }[];
}

export const CouncilBudgetTab: React.FC<CouncilBudgetTabProps> = ({
  budgets,
  expenses,
  onRefresh,
  councilToken,
  committees = []
}) => {
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionId, setActionId] = useState<string | null>(null);

  // Expanded department on card for seeing recent transactions
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  // Edit/Add Department Budget Modal
  const [editingBudget, setEditingBudget] = useState<{
    department: string;
    amount: number;
    notes: string;
    isNew?: boolean;
  } | null>(null);

  // Direct Record Expense Modal
  const [spendingModal, setSpendingModal] = useState<{
    isOpen: boolean;
    department: string;
    title: string;
    amount: string;
    paidTo: string;
    notes: string;
    status: 'approved' | 'pending';
  }>({
    isOpen: false,
    department: budgets[0]?.department || 'Stage & Production',
    title: '',
    amount: '',
    paidTo: '',
    notes: '',
    status: 'approved'
  });

  // Edit existing expense modal
  const [editingExpenseItem, setEditingExpenseItem] = useState<CouncilExpense | null>(null);

  // Financial Calculations
  const totalAllocated = useMemo(() => {
    return budgets.reduce((acc, b) => acc + Number(b.allocated_amount || 0), 0);
  }, [budgets]);

  const totalApproved = useMemo(() => {
    return expenses
      .filter(e => e.status === 'approved')
      .reduce((acc, e) => acc + Number(e.amount || 0), 0);
  }, [expenses]);

  const totalPending = useMemo(() => {
    return expenses
      .filter(e => e.status === 'pending')
      .reduce((acc, e) => acc + Number(e.amount || 0), 0);
  }, [expenses]);

  const remainingBalance = totalAllocated - totalApproved;
  const overallSpentPercent = totalAllocated > 0 ? Math.round((totalApproved / totalAllocated) * 100) : 0;

  // Department-wise stats
  const departmentStats = useMemo(() => {
    return budgets.map(b => {
      const deptExpenses = expenses.filter(e => e.department.toLowerCase() === b.department.toLowerCase());
      const spent = deptExpenses
        .filter(e => e.status === 'approved')
        .reduce((acc, e) => acc + Number(e.amount || 0), 0);
      const pending = deptExpenses
        .filter(e => e.status === 'pending')
        .reduce((acc, e) => acc + Number(e.amount || 0), 0);
      const remaining = Number(b.allocated_amount) - spent;
      const percent = Number(b.allocated_amount) > 0 ? Math.round((spent / Number(b.allocated_amount)) * 100) : 0;
      return {
        ...b,
        spent,
        pending,
        remaining,
        percent,
        transactions: deptExpenses
      };
    });
  }, [budgets, expenses]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (filterDepartment !== 'all' && e.department !== filterDepartment) return false;
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      return true;
    });
  }, [expenses, filterDepartment, filterStatus]);

  const formatCurrency = (amt: number) => {
    return '₹' + Number(amt || 0).toLocaleString('en-IN');
  };

  // Open Record Spending Modal for a specific department
  const handleOpenRecordSpending = (deptName: string) => {
    setSpendingModal({
      isOpen: true,
      department: deptName,
      title: '',
      amount: '',
      paidTo: '',
      notes: '',
      status: 'approved'
    });
  };

  // Submit Spending
  const handleSubmitSpending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spendingModal.department || !spendingModal.title.trim() || !spendingModal.amount) {
      toast.error('Please enter department, title, and amount');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'expense-create',
          payload: {
            department: spendingModal.department.trim(),
            title: spendingModal.title.trim(),
            amount: Number(spendingModal.amount),
            requested_by: spendingModal.paidTo.trim() || 'Council Admin',
            status: spendingModal.status,
            notes: spendingModal.notes.trim() || null
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to record expense');
      toast.success(`Expense recorded for ${spendingModal.department}!`);
      setSpendingModal(prev => ({ ...prev, isOpen: false }));
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Existing Expense Item
  const handleSaveExpenseEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpenseItem) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'expense-update',
          payload: {
            id: editingExpenseItem.id,
            department: editingExpenseItem.department,
            title: editingExpenseItem.title,
            amount: Number(editingExpenseItem.amount),
            requested_by: editingExpenseItem.requested_by,
            notes: editingExpenseItem.notes,
            status: editingExpenseItem.status
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update expense');
      toast.success('Expense item updated successfully!');
      setEditingExpenseItem(null);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Save/Update Department Budget Cap
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget?.department.trim()) {
      toast.error('Department name is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'budget-set',
          payload: {
            department: editingBudget.department.trim(),
            allocated_amount: Number(editingBudget.amount || 0),
            notes: editingBudget.notes.trim() || null
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update budget');
      toast.success(`Budget updated for ${editingBudget.department}!`);
      setEditingBudget(null);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Budget update failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Status of Expense
  const handleUpdateExpenseStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    setActionId(id);
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'expense-status',
          payload: { id, status: newStatus }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update status');
      toast.success(newStatus === 'approved' ? 'Expense approved and deducted from budget!' : 'Expense rejected');
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionId(null);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id: string, itemTitle: string) => {
    if (!window.confirm(`Delete expense record "${itemTitle}"? This will return the funds to the available budget.`)) return;
    try {
      const res = await fetch('/api/council-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          councilToken,
          action: 'expense-delete',
          payload: { id }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete');
      toast.success('Expense record deleted');
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-8">
      {/* Financial Health Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-950 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm shadow-lg">
          <div className="text-gray-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-indigo-400" />
            Total Allocated Budget
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">{formatCurrency(totalAllocated)}</div>
          <div className="text-[11px] text-gray-500 mt-1">Festival Committee Cap</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-950/20 to-gray-950 border border-emerald-900/40 p-5 rounded-2xl backdrop-blur-sm shadow-lg">
          <div className="text-emerald-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Spent / Disbursed
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-300 tracking-tight">
            {formatCurrency(totalApproved)}
            <span className="text-xs text-emerald-500 font-semibold ml-1.5">({overallSpentPercent}%)</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Approved & Completed</div>
        </div>

        <div className="bg-gradient-to-br from-amber-950/20 to-gray-950 border border-amber-900/40 p-5 rounded-2xl backdrop-blur-sm shadow-lg">
          <div className="text-amber-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            Pending Approvals
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">{formatCurrency(totalPending)}</div>
          <div className="text-[11px] text-gray-400 mt-1">Awaiting Council Sign-off</div>
        </div>

        <div className="bg-gradient-to-br from-cyan-950/20 to-gray-950 border border-cyan-900/40 p-5 rounded-2xl backdrop-blur-sm shadow-lg">
          <div className="text-cyan-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Remaining Balance
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-tight ${remainingBalance >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
            {formatCurrency(remainingBalance)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Available to allocate & spend</div>
        </div>
      </div>

      {/* Department-wise Budgets & Action Cards */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-5 md:p-8 backdrop-blur-sm space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-400" />
              Department Budgets & Real-Time Tracking
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Record payments, update department budget caps, and track real-time utilization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenRecordSpending(budgets[0]?.department || 'Stage & Production')}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
            >
              <ArrowDownRight className="w-4 h-4" />
              + Record Expense / Payment
            </button>

            <button
              onClick={() => setEditingBudget({ department: '', amount: 50000, notes: '', isNew: true })}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              + Add Department
            </button>
          </div>
        </div>

        {/* Department Grid */}
        {departmentStats.length === 0 ? (
          <div className="text-center py-12 px-4 bg-black/40 border border-gray-800 rounded-2xl">
            <Building className="w-10 h-10 mx-auto mb-3 text-indigo-400 opacity-40" />
            <h3 className="text-base font-bold text-white mb-1">No Department Budgets Configured Yet</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto mb-5">
              Start by allocating your first department budget (e.g., Stage & Production, Artist & Sound, Logistics).
            </p>
            <button
              onClick={() => setEditingBudget({ department: 'Stage & Production', amount: 150000, notes: '', isNew: true })}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl inline-flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              + Add First Department
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {departmentStats.map(dept => {
              const isOverBudget = dept.remaining < 0;
              const isExpanded = expandedDept === dept.department;

              return (
                <div
                  key={dept.id}
                  className={`bg-black/60 border rounded-2xl p-5 transition-all duration-200 hover:border-gray-700 flex flex-col justify-between ${
                    isOverBudget ? 'border-rose-900/60 bg-rose-950/10' : 'border-gray-800/90'
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base">
                            {dept.department}
                          </h3>
                          {isOverBudget && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Over Budget
                            </span>
                          )}
                        </div>
                        {dept.notes && (
                          <p className="text-[11px] text-gray-400 mt-0.5">{dept.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingBudget({ department: dept.department, amount: dept.allocated_amount, notes: dept.notes || '', isNew: false })}
                          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors text-xs flex items-center gap-1"
                          title="Edit allocated budget"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Edit Budget</span>
                        </button>
                      </div>
                    </div>

                    {/* Financial Stats Metric Row */}
                    <div className="grid grid-cols-3 gap-2 bg-gray-950/80 border border-gray-800/70 rounded-xl p-3 my-3">
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider">Spent</span>
                        <strong className="text-emerald-400 text-sm md:text-base font-black">{formatCurrency(dept.spent)}</strong>
                      </div>

                      <div className="text-center border-x border-gray-800/80 px-2">
                        <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider">Remaining</span>
                        <strong className={`text-sm md:text-base font-black ${dept.remaining >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                          {formatCurrency(dept.remaining)}
                        </strong>
                      </div>

                      <div className="text-right">
                        <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider">Allocated</span>
                        <strong className="text-white text-sm md:text-base font-black">{formatCurrency(dept.allocated_amount)}</strong>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 mt-2">
                      <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            dept.percent > 90 ? 'bg-rose-500' : dept.percent > 70 ? 'bg-amber-400' : 'bg-cyan-400'
                          }`}
                          style={{ width: `${Math.min(dept.percent, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-400 font-medium pt-0.5">
                        <span>{dept.percent}% consumed</span>
                        {dept.pending > 0 && (
                          <span className="text-amber-400 font-semibold">+{formatCurrency(dept.pending)} in review</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Direct Action Buttons on Card */}
                  <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenRecordSpending(dept.department)}
                      className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Record for {dept.department.split('&')[0].trim()}
                    </button>

                    <button
                      onClick={() => setExpandedDept(isExpanded ? null : dept.department)}
                      className="p-2 text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-xs flex items-center gap-1 transition-colors"
                      title="View Transactions"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{dept.transactions.length}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Expanded Payment History for this Department */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-800/90 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold mb-1">
                        <span>Payment Records ({dept.department}):</span>
                      </div>

                      {dept.transactions.length === 0 ? (
                        <div className="text-center py-4 text-xs text-gray-500 bg-black/40 rounded-xl">
                          No expenses recorded for this department yet.
                        </div>
                      ) : (
                        dept.transactions.slice(0, 5).map(tx => (
                          <div
                            key={tx.id}
                            className="bg-black/50 border border-gray-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="truncate flex-1">
                              <span className="font-bold text-white block truncate">{tx.title}</span>
                              <span className="text-[10px] text-gray-400 block truncate">
                                Paid to: {tx.requested_by} • {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-mono font-bold ${
                                tx.status === 'approved' ? 'text-emerald-400' : tx.status === 'pending' ? 'text-amber-400' : 'text-rose-400'
                              }`}>
                                {formatCurrency(tx.amount)}
                              </span>
                              <button
                                onClick={() => setEditingExpenseItem(tx)}
                                className="p-1 text-gray-400 hover:text-white"
                                title="Edit item"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(tx.id, tx.title)}
                                className="p-1 text-gray-500 hover:text-rose-400"
                                title="Delete record"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All Expenses & Payment Logs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-900/50 border border-gray-800 p-4 md:p-5 rounded-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-400" /> Filter Payment Logs:
            </span>
            <select
              value={filterDepartment}
              onChange={e => setFilterDepartment(e.target.value)}
              className="bg-black/60 border border-gray-700 text-xs text-gray-300 rounded-lg px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">All Departments ({expenses.length})</option>
              {budgets.map(b => <option key={b.department} value={b.department}>{b.department}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-black/60 border border-gray-700 text-xs text-gray-300 rounded-lg px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="approved">Paid / Approved ({expenses.filter(e => e.status === 'approved').length})</option>
              <option value="pending">Pending Approval ({expenses.filter(e => e.status === 'pending').length})</option>
              <option value="rejected">Rejected ({expenses.filter(e => e.status === 'rejected').length})</option>
            </select>
          </div>

          <button
            onClick={() => handleOpenRecordSpending(budgets[0]?.department || 'General')}
            className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs md:text-sm px-4 py-2 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            + Record Expense / Payment
          </button>
        </div>

        {/* Expenses List */}
        <div className="space-y-3">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-14 bg-gray-900/30 border border-gray-800/80 rounded-2xl text-gray-500">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-400" />
              <p className="text-sm font-medium">No expense items match current filters.</p>
              <p className="text-xs text-gray-600 mt-1">Use the "+ Record Expense / Payment" button above to log spending.</p>
            </div>
          ) : (
            filteredExpenses.map(item => {
              const isPending = item.status === 'pending';
              const isApproved = item.status === 'approved';

              return (
                <div
                  key={item.id}
                  className={`bg-gray-900/50 border rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${
                    isPending
                      ? 'border-amber-500/40 bg-amber-950/15'
                      : isApproved
                      ? 'border-gray-800 hover:border-gray-700'
                      : 'border-rose-900/30 opacity-70 bg-black/40'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isApproved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : isPending
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {isApproved ? 'PAID / APPROVED' : isPending ? 'PENDING APPROVAL' : 'REJECTED'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {item.department}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Paid to / By: <strong className="text-gray-200">{item.requested_by}</strong>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">{item.title}</h3>
                    {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <span className="text-xl md:text-2xl font-black text-white font-mono">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="block text-[10px] text-gray-500">
                        {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {isPending ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={actionId === item.id}
                          onClick={() => handleUpdateExpenseStatus(item.id, 'approved')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve Payment
                        </button>
                        <button
                          disabled={actionId === item.id}
                          onClick={() => handleUpdateExpenseStatus(item.id, 'rejected')}
                          className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all"
                          title="Reject"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingExpenseItem(item)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
                          title="Edit payment details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(item.id, item.title)}
                          className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                          title="Delete payment entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= MODAL: RECORD SPENDING ================= */}
      {spendingModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setSpendingModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-400" />
              Record Department Expense
            </h2>
            <p className="text-xs text-gray-400 mb-6">
              Enter disbursement amount, purpose, and vendor to update the department budget in real time.
            </p>

            <form onSubmit={handleSubmitSpending} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Department / Committee *
                </label>
                {budgets.length > 0 ? (
                  <select
                    value={spendingModal.department}
                    onChange={e => setSpendingModal({ ...spendingModal, department: e.target.value })}
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    {budgets.map(b => (
                      <option key={b.department} value={b.department}>
                        {b.department} (Budget Cap: {formatCurrency(b.allocated_amount)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={spendingModal.department}
                    onChange={e => setSpendingModal({ ...spendingModal, department: e.target.value })}
                    placeholder="e.g., Stage & Production"
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Amount Paid (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={spendingModal.amount}
                    onChange={e => setSpendingModal({ ...spendingModal, amount: e.target.value })}
                    placeholder="e.g., 25000"
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-base text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Paid To / Vendor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={spendingModal.paidTo}
                    onChange={e => setSpendingModal({ ...spendingModal, paidTo: e.target.value })}
                    placeholder="e.g., Stage Incharge / Vendor"
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Purpose / Item Description *
                </label>
                <input
                  type="text"
                  required
                  value={spendingModal.title}
                  onChange={e => setSpendingModal({ ...spendingModal, title: e.target.value })}
                  placeholder="e.g., Stage LED screen advance / Truss setup"
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Payment Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSpendingModal({ ...spendingModal, status: 'approved' })}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      spendingModal.status === 'approved'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                        : 'bg-black/40 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Direct Payment (Auto-Approved)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSpendingModal({ ...spendingModal, status: 'pending' })}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      spendingModal.status === 'pending'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                        : 'bg-black/40 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-amber-400" />
                    Pending Approval (Bill)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Notes / Bill / Quotation No. (Optional)</label>
                <textarea
                  rows={2}
                  value={spendingModal.notes}
                  onChange={e => setSpendingModal({ ...spendingModal, notes: e.target.value })}
                  placeholder="UPI ref, cash voucher, invoice no..."
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSpendingModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save & Update Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT DEPARTMENT BUDGET CAP ================= */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setEditingBudget(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-400" />
              {editingBudget.isNew ? 'Create Department Budget' : `Edit Budget: ${editingBudget.department}`}
            </h2>
            <p className="text-xs text-gray-400 mb-6">
              Set the total allocated financial cap for this committee.
            </p>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Department Name *</label>
                <input
                  type="text"
                  required
                  disabled={!editingBudget.isNew}
                  value={editingBudget.department}
                  onChange={e => setEditingBudget({ ...editingBudget, department: e.target.value })}
                  placeholder="e.g., Technical Team, Event Management"
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 font-semibold"
                />

                {editingBudget.isNew && committees.length > 0 && (
                  <div className="mt-2.5">
                    <span className="text-[10px] text-gray-400 block mb-1.5 font-medium">From Rico Family (Admin):</span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                      {Array.from(new Set(committees.map(c => c.name))).map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setEditingBudget({ ...editingBudget, department: name })}
                          className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                            editingBudget.department === name
                              ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500 shadow-sm'
                              : 'bg-black/40 text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Allocated Cap (₹) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editingBudget.amount}
                  onChange={e => setEditingBudget({ ...editingBudget, amount: Number(e.target.value) })}
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-base text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Description / Scope</label>
                <input
                  type="text"
                  value={editingBudget.notes}
                  onChange={e => setEditingBudget({ ...editingBudget, notes: e.target.value })}
                  placeholder="e.g., Main stage, LED walls, generator fuel..."
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingBudget(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT EXISTING EXPENSE ITEM ================= */}
      {editingExpenseItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setEditingExpenseItem(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-400" />
              Edit Payment Entry
            </h2>
            <p className="text-xs text-gray-400 mb-6">Update payment details or amount.</p>

            <form onSubmit={handleSaveExpenseEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Department</label>
                <select
                  value={editingExpenseItem.department}
                  onChange={e => setEditingExpenseItem({ ...editingExpenseItem, department: e.target.value })}
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {budgets.map(b => <option key={b.department} value={b.department}>{b.department}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Purpose / Title</label>
                <input
                  type="text"
                  required
                  value={editingExpenseItem.title}
                  onChange={e => setEditingExpenseItem({ ...editingExpenseItem, title: e.target.value })}
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingExpenseItem.amount}
                    onChange={e => setEditingExpenseItem({ ...editingExpenseItem, amount: Number(e.target.value) })}
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Paid To / Recipient</label>
                  <input
                    type="text"
                    required
                    value={editingExpenseItem.requested_by}
                    onChange={e => setEditingExpenseItem({ ...editingExpenseItem, requested_by: e.target.value })}
                    className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Status</label>
                <select
                  value={editingExpenseItem.status}
                  onChange={e => setEditingExpenseItem({ ...editingExpenseItem, status: e.target.value as any })}
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="approved">Paid / Approved</option>
                  <option value="pending">Pending Review</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Notes</label>
                <textarea
                  rows={2}
                  value={editingExpenseItem.notes || ''}
                  onChange={e => setEditingExpenseItem({ ...editingExpenseItem, notes: e.target.value })}
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingExpenseItem(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Update Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
