import { useState, useMemo, useRef, DragEvent, ChangeEvent } from 'react';
import { useTransactions, STANDARD_CATEGORIES } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  AlertTriangle,
  UploadCloud,
  Loader,
  Sparkles,
  Settings,
  X,
  CreditCard,
  Plus
} from 'lucide-react';
import { Transaction } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function Dashboard() {
  const { authState } = useAuth();
  const {
    transactions,
    addTransaction,
    budgetStatuses,
    saveBudget,
    scanReceipt,
    isLoading: dbLoading,
    voiceFilter,
    clearVoiceFilter
  } = useTransactions();

  const activeTransactions = useMemo(() => {
    if (voiceFilter && voiceFilter.active && voiceFilter.matchingIds) {
      return transactions.filter(t => voiceFilter.matchingIds.includes(t.id));
    }
    return transactions;
  }, [transactions, voiceFilter]);

  // Dialog State for AI Scan Results Validation
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [receiptFileInfo, setReceiptFileInfo] = useState<string | null>(null);

  // Form Fields for newly parsed/created transaction
  const [aiFormDesc, setAiFormDesc] = useState('');
  const [aiFormAmount, setAiFormAmount] = useState<number | string>('');
  const [aiFormDate, setAiFormDate] = useState('');
  const [aiFormCategory, setAiFormCategory] = useState('Food');
  const [aiFormPayMethod, setAiFormPayMethod] = useState<'UPI' | 'Cash' | 'Card'>('Card');
  const [aiConfidence, setAiConfidence] = useState<number>(100);

  // Active state for inline budget adjustment drawer
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editedBudgets, setEditedBudgets] = useState<Record<string, number>>({});

  // Dropzone drag-over active state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Parse transaction date safely (handles full ISO strings and YYYY-MM-DD)
  const parseTxDate = (dateStr: string) => {
    const base = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    return new Date(base + 'T00:00:00');
  };

  // Helper: Format amount to elegant financial string
  const formatCur = (v: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(v);
  };

  // Dynamic Month Constants for Cash Flow and Centerpiece Labels
  const { prevMonthName, curMonthName, prevMonthIdx, curMonthIdx, prevMonthYear, curMonthYear, currentMonth, currentYear } = useMemo(() => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();

    const prevMonthDate = new Date(curYear, curMonth - 1, 1);
    return {
      prevMonthName: prevMonthDate.toLocaleString('default', { month: 'short' }),
      curMonthName: today.toLocaleString('default', { month: 'short' }),
      prevMonthIdx: prevMonthDate.getMonth(),
      curMonthIdx: curMonth,
      prevMonthYear: prevMonthDate.getFullYear(),
      curMonthYear: curYear,
      currentMonth: curMonth,
      currentYear: curYear
    };
  }, []);

  // Determine target display month/year dynamically (falls back to latest month containing transactions if current calendar month has none)
  const { displayMonth, displayYear, displayMonthName } = useMemo(() => {
    const today = new Date();
    let targetMonth = today.getMonth();
    let targetYear = today.getFullYear();

    if (activeTransactions.length > 0) {
      const sortedTxs = [...activeTransactions].sort((a, b) => b.date.localeCompare(a.date));
      const latestTxDate = parseTxDate(sortedTxs[0].date);
      
      const currentMonthTxs = activeTransactions.filter(t => {
        const txDate = parseTxDate(t.date);
        return txDate.getFullYear() === today.getFullYear() && txDate.getMonth() === today.getMonth();
      });
      if (currentMonthTxs.length === 0) {
        targetMonth = latestTxDate.getMonth();
        targetYear = latestTxDate.getFullYear();
      }
    }

    const targetMonthDate = new Date(targetYear, targetMonth, 1);
    const monthName = targetMonthDate.toLocaleString('default', { month: 'short' });

    return {
      displayMonth: targetMonth,
      displayYear: targetYear,
      displayMonthName: monthName
    };
  }, [activeTransactions]);

  // 1. Calculate Key Metrics
  const metrics = useMemo(() => {
    const today = new Date();

    // Display Month Totals
    const displayMonthTxs = activeTransactions.filter(t => {
      const txDate = parseTxDate(t.date);
      return txDate.getFullYear() === displayYear && txDate.getMonth() === displayMonth;
    });

    const monthlyIncome = displayMonthTxs
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpense = displayMonthTxs
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Cumulative Balance across ALL history
    const totalIncomeAll = activeTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenseAll = activeTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncomeAll - totalExpenseAll;

    // Trend calculations: Weeks boundaries
    const msPerDay = 24 * 60 * 60 * 1000;
    const currentWeekStart = new Date(today.getTime() - 7 * msPerDay);
    const prevWeekStart = new Date(today.getTime() - 14 * msPerDay);

    // Current week expenses
    const curWeekExpense = activeTransactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        const txDate = parseTxDate(t.date);
        return txDate >= currentWeekStart && txDate <= today;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Prior week expenses
    const priWeekExpense = activeTransactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        const txDate = parseTxDate(t.date);
        return txDate >= prevWeekStart && txDate < currentWeekStart;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    let expenseTrend = 0; // percentage
    if (priWeekExpense > 0) {
      expenseTrend = ((curWeekExpense - priWeekExpense) / priWeekExpense) * 100;
    }

    return {
      balance,
      income: monthlyIncome,
      expense: monthlyExpense,
      weeklyExpensePctChange: expenseTrend,
      curWeekExpense,
      priWeekExpense
    };
  }, [activeTransactions, displayMonth, displayYear]);

  // 2. Format Data for Category Donut Chart (Dynamic fallback logic for months with data)
  const { donutData, donutMonthName, donutTotalExpense } = useMemo(() => {
    const targetMonthExpenses = activeTransactions.filter(t => {
      if (t.type !== 'expense') return false;
      const txDate = parseTxDate(t.date);
      return txDate.getFullYear() === displayYear && txDate.getMonth() === displayMonth;
    });

    const categoryTotals = targetMonthExpenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const data = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value: parseFloat((value as number).toFixed(2)),
    }));

    const totalExpense = targetMonthExpenses.reduce((sum, t) => sum + t.amount, 0);

    return {
      donutData: data,
      donutMonthName: displayMonthName,
      donutTotalExpense: totalExpense
    };
  }, [activeTransactions, displayMonth, displayYear, displayMonthName]);

  // Dynamic Budget Statuses for the displayed month
  const displayBudgetStatuses = useMemo(() => {
    const targetMonthExpenses = activeTransactions.filter(t => {
      if (t.type !== 'expense') return false;
      const txDate = parseTxDate(t.date);
      return txDate.getFullYear() === displayYear && txDate.getMonth() === displayMonth;
    });

    const categorySums = targetMonthExpenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return STANDARD_CATEGORIES.map(category => {
      const bObj = budgetStatuses.find(b => b.category === category);
      const limit = bObj ? bObj.limit : 0;
      const spent = categorySums[category] || 0;
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;

      let color = 'green';
      if (percentage >= 100) {
        color = 'red';
      } else if (percentage >= 80) {
        color = 'yellow';
      }

      return {
        category,
        limit,
        spent: parseFloat(spent.toFixed(2)),
        percentage: parseFloat(percentage.toFixed(1)),
        color,
      };
    });
  }, [activeTransactions, budgetStatuses, displayMonth, displayYear]);

  const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#f43f5e', '#a855f7'];

  // 3. Format Date / Months for Cash Flow Bar Chart (Dynamic comparison card)
  const cashFlowData = useMemo(() => {
    const monthsList = [prevMonthName, curMonthName];
    const yearsList = [prevMonthYear, curMonthYear];
    const indicesList = [prevMonthIdx, curMonthIdx];

    return monthsList.map((month, idx) => {
      const targetMonthIdx = indicesList[idx];
      const targetYear = yearsList[idx];

      const monthTxs = activeTransactions.filter(t => {
        const txDate = parseTxDate(t.date);
        return txDate.getFullYear() === targetYear && txDate.getMonth() === targetMonthIdx;
      });

      const income = monthTxs
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = monthTxs
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        name: month,
        Income: parseFloat(income.toFixed(2)),
        Expense: parseFloat(expense.toFixed(2)),
      };
    });
  }, [activeTransactions, prevMonthName, curMonthName, prevMonthIdx, curMonthIdx, prevMonthYear, curMonthYear]);

  // Handle Drag & Drop Events
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleReceiptFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleReceiptFile(e.target.files[0]);
    }
  };

  const handleReceiptFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAiError('Only JPG, JPEG or PNG image files are supported.');
      return;
    }

    setReceiptFileInfo(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    setAiLoading(true);
    setIsAiModalOpen(true);
    setAiError(null);

    // Convert file to Base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const parsed = await scanReceipt(base64String, file.type);
        // Prefill form
        setAiFormDesc(parsed.vendor || 'Extracted Receipt');
        setAiFormAmount(parsed.amount || 0);
        setAiFormDate(parsed.date || new Date().toISOString().split('T')[0]);
        setAiFormCategory(parsed.category || 'Food');
        setAiConfidence(parsed.confidence ?? 100);
      } catch (err: any) {
        setAiError(err.message || 'AI receipt model was unable to parse the merchant data. Please pre-fill fields manually.');
        setAiFormDesc('New Receipt - Manual Fill');
        setAiFormAmount(0);
        setAiFormDate(new Date().toISOString().split('T')[0]);
        setAiFormCategory('Food');
        setAiConfidence(0);
      } finally {
        setAiLoading(false);
      }
    };
    reader.onerror = () => {
      setAiError('Failed to read files. Please upload another photo.');
      setAiLoading(false);
    };
    reader.readAsDataURL(file);
  };

  // Submit parsed OCR values
  const handleSaveAiTransaction = async () => {
    if (!aiFormDesc || !aiFormAmount || !aiFormDate) {
      setAiError('Please populate description, amount, and date.');
      return;
    }

    try {
      await addTransaction({
        description: aiFormDesc,
        amount: Number(aiFormAmount),
        type: 'expense',
        category: aiFormCategory,
        date: aiFormDate,
        paymentMethod: aiFormPayMethod
      });
      setIsAiModalOpen(false);
    } catch (e) {
      setAiError('Failed to record transaction. Please try again.');
    }
  };

  // Inline Budget updates management
  const openBudgetEditor = () => {
    const limits: Record<string, number> = {};
    budgetStatuses.forEach(s => {
      limits[s.category] = s.limit;
    });
    setEditedBudgets(limits);
    setIsEditingBudget(true);
  };

  const handleSaveBudgets = async () => {
    try {
      for (const [category, limit] of Object.entries(editedBudgets)) {
        await saveBudget(category, limit);
      }
      setIsEditingBudget(false);
    } catch (e) {
      alert('Unable to save modified budget ceilings.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 dark:text-neutral-50 font-heading tracking-tight">
            Financial Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 font-sans mt-0.5">
            Welcome back, <span className="font-semibold text-indigo-600 dark:text-indigo-400">{authState.user?.name}</span>. Analyzing live ledger and OCR records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openBudgetEditor}
            className="px-4 py-2.5 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-neutral-900 dark:border-neutral-850 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Settings className="h-4 w-4 text-indigo-500" />
            Adjust Budget Limits
          </button>
        </div>
      </div>

      {/* Voice Filter Active Banner */}
      <AnimatePresence>
        {voiceFilter?.active && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="bg-indigo-50/70 dark:bg-indigo-950/25 border border-indigo-150 dark:border-indigo-900/40 rounded-2xl p-4 flex items-start justify-between gap-3 font-sans overflow-hidden"
          >
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl mt-0.5">
                <Sparkles className="h-4 w-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded">
                    🎙️ Voice Filter Applied
                  </span>
                  <span className="text-xs text-slate-500 dark:text-neutral-400 font-bold italic">
                    "{voiceFilter.query}"
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-neutral-200 mt-1.5">
                  {voiceFilter.summary}
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  Showing matches within dashboard analytics and budget status bars.
                </p>
              </div>
            </div>
            <button
              onClick={clearVoiceFilter}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
            >
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bento Grid Concept Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Total Balance bento block */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          whileHover={{ y: -3, scale: 1.015, boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.05)' }}
          className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-slate-200 dark:border-neutral-800/70 shadow-xs flex flex-col justify-between h-36 transition-all duration-200 cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest">Total Net Balance</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-md">Live</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-slate-950 dark:text-neutral-50 tracking-tight font-heading">
              {formatCur(metrics.balance)}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1 font-medium">All-time record balance sheet</span>
          </div>
        </motion.div>

        {/* Metric 2: Monthly Income bento block */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          whileHover={{ y: -3, scale: 1.015, boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.05)' }}
          className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-slate-200 dark:border-neutral-800/70 shadow-xs flex flex-col justify-between h-36 transition-all duration-200 cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest">Monthly Inflow</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-md">+2%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-heading">
              {formatCur(metrics.income)}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1 font-medium">Earned in {displayMonthName}</span>
          </div>
        </motion.div>

        {/* Metric 3: Monthly Expenses bento block */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          whileHover={{ y: -3, scale: 1.015, boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.05)' }}
          className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-slate-200 dark:border-neutral-800/70 shadow-xs flex flex-col justify-between h-36 transition-all duration-200 cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest">Monthly Outgo</span>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400 px-2 py-0.5 rounded-md">
              {metrics.weeklyExpensePctChange !== 0 ? `${metrics.weeklyExpensePctChange > 0 ? '+' : ''}${metrics.weeklyExpensePctChange.toFixed(0)}%` : 'Active'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-heading">
              {formatCur(metrics.expense)}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1 font-medium">Spent in {displayMonthName}</span>
          </div>
        </motion.div>

        {/* Metric 4: Premium Forecast block (Indigo highlight Bento centerpiece) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ y: -3, scale: 1.015, boxShadow: '0 8px 20px -4px rgba(99, 102, 241, 0.15)' }}
          className="bg-indigo-600 dark:bg-indigo-950 p-5 rounded-2xl border border-indigo-500 dark:border-indigo-900/60 shadow-xs flex flex-col justify-between h-36 text-white transition-all duration-200 relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
          <div className="flex justify-between items-start z-10">
            <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Cashflow Forecast</span>
            <span className="text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-md">AI Insights</span>
          </div>
          <div className="flex flex-col z-10">
            <span className="text-2xl font-black tracking-tight font-heading">
              {formatCur(metrics.balance + (metrics.income - metrics.expense))}
            </span>
            <span className="text-[11px] text-indigo-150 mt-1 font-medium">Estimated cash status next cycle</span>
          </div>
        </motion.div>

        {/* Row 2 Bento columns */}
        {/* Cash Flow Analytics bar charts (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-slate-200 dark:border-neutral-800/70 shadow-xs flex flex-col space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-neutral-800/50">
            <div>
              <h3 className="text-sm font-bold text-slate-950 dark:text-neutral-50 font-heading">
                Cash Flow Analytics
              </h3>
              <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                {prevMonthName} vs {curMonthName} side-by-side volume distribution
              </p>
            </div>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><span className="w-2 h-2 rounded bg-emerald-500 inline-block"></span> Income</span>
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400"><span className="w-2 h-2 rounded bg-indigo-500 inline-block"></span> Expenses</span>
            </div>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }}
                  contentStyle={{
                    borderRadius: '12px',
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    color: '#f8fafc',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Expense" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses by Category Breakdown Pie (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-slate-200 dark:border-neutral-800/70 shadow-xs flex flex-col space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-neutral-800/50">
            <div>
              <h3 className="text-sm font-bold text-slate-950 dark:text-neutral-50 font-heading">
                Expenses by Category
              </h3>
              <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                Current month spending percentage breakdown
              </p>
            </div>
          </div>

          <div className="flex items-center flex-1 min-h-[160px]">
            <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
              {donutData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        borderColor: '#f1f5f9',
                        fontSize: '11px',
                      }}
                      formatter={(v) => [`$${v}`, 'Spent']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full rounded-full border-[12px] border-slate-100 dark:border-neutral-850 flex items-center justify-center text-[10px] text-slate-400 text-center p-2">
                  No Expense
                </div>
              )}
              <div className="absolute flex flex-col items-center">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">{donutMonthName} Total</span>
                <span className="text-sm font-black text-slate-950 dark:text-neutral-50">${donutTotalExpense.toFixed(0)}</span>
              </div>
            </div>

            <div className="flex-1 ml-6 space-y-2 h-36 overflow-y-auto pr-1">
              {donutData.length > 0 ? (
                donutData.slice(0, 4).map((d, idx) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-neutral-300 truncate max-w-[80px]">{d.name}</span>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-neutral-500 font-bold">
                      {donutTotalExpense > 0 ? `${((d.value / donutTotalExpense) * 100).toFixed(0)}%` : '0%'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 text-center py-8">
                  Create transaction in Ledger to visualize.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 3 Bento columns */}
        {/* Monthly Budget Ceilings Status (Spans 3 columns) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-slate-200 dark:border-neutral-800/70 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-neutral-800/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-50 font-heading">
                Monthly Budget Limits
              </h3>
              <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                Comparison of actual limits vs spending
              </p>
            </div>
            <button
              onClick={openBudgetEditor}
              className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400 cursor-pointer font-bold flex items-center gap-1"
            >
              <Settings className="w-3.5 h-3.5" /> Adjust Limits
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {displayBudgetStatuses.slice(0, 6).map(b => (
              <div key={b.category} className="p-3 bg-slate-50 dark:bg-neutral-950/40 rounded-xl border border-slate-150 dark:border-neutral-850/60 space-y-1.5 text-xs font-sans">
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-neutral-200">
                  <span className="truncate">{b.category}</span>
                  <span className="text-[10px] text-slate-400">
                    ${b.spent.toFixed(0)} / ${b.limit || '—'}
                  </span>
                </div>

                {/* Progress Bar Container */}
                <div className="w-full h-2 bg-slate-200 dark:bg-neutral-800 rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(b.percentage, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      b.percentage >= 100
                        ? 'bg-rose-500'
                        : b.percentage >= 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                </div>

                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                  <span>Usage: {b.percentage.toFixed(0)}%</span>
                  {b.percentage >= 100 ? (
                    <span className="text-rose-600 dark:text-rose-400">Breached</span>
                  ) : b.percentage >= 80 ? (
                    <span className="text-amber-600 dark:text-amber-400">Approaching</span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400">Safe</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Scan Receipt block (Spans 1 column) */}
        <div className="col-span-1 bg-slate-100 dark:bg-neutral-900/60 rounded-2xl border-2 border-dashed border-slate-300 dark:border-neutral-800 hover:border-indigo-500 dark:hover:border-indigo-500 flex flex-col justify-between p-5 text-center group cursor-pointer transition-colors"
             onDragEnter={handleDrag}
             onDragLeave={handleDrag}
             onDragOver={handleDrag}
             onDrop={handleDrop}
             onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-neutral-850 flex items-center justify-center text-slate-400 dark:text-neutral-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors mb-3 shadow-xs">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-neutral-250 font-heading">AI Scan Receipt</p>
            <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">Drag & drop receipt photo here</p>
          </div>
          <div className="mt-4 w-full">
            <div className="w-full bg-slate-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-500 h-full" style={{ width: '85%' }}></div>
            </div>
            <p className="text-[9px] text-indigo-600 dark:text-indigo-400 mt-2 font-bold uppercase tracking-wider">OCR limits status: 85% computed</p>
          </div>
        </div>
      </div>


      {/* OCR Validation Dialog / Confirmation Modal */}
      <AnimatePresence>
        {isAiModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-800 shadow-xl w-full max-w-lg p-6 relative overflow-hidden flex flex-col justify-between"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">
                    AI OCR Process Hub
                  </h3>
                </div>
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Loading/Results State */}
              <div className="py-6 space-y-4">
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                    <Loader className="h-8 w-8 text-indigo-500 animate-spin" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                      Gemini AI analyzing receipt metrics...
                    </p>
                    <p className="text-xs text-slate-400">
                      Extracting vendor details, amount metrics, and category choices.
                    </p>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 px-3 py-1 rounded-full font-semibold">
                      {receiptFileInfo}
                    </span>
                  </div>
                ) : (
                  <>
                    {aiError && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
                        <AlertTriangle className="h-5 w-5 mt-0.5" />
                        <span>{aiError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {/* Description */}
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Merchant / Vendor</label>
                        <input
                          type="text"
                          value={aiFormDesc}
                          onChange={e => setAiFormDesc(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-sm text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                          placeholder="e.g. Target Store"
                        />
                      </div>

                      {/* Amount */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Amount Paid (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={aiFormAmount}
                          onChange={e => setAiFormAmount(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-sm text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Date */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Transaction Date</label>
                        <input
                          type="date"
                          value={aiFormDate}
                          onChange={e => setAiFormDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-sm text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                        />
                      </div>

                      {/* Category */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Category</label>
                        <select
                          value={aiFormCategory}
                          onChange={e => setAiFormCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-sm text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                        >
                          {STANDARD_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Payment Method */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Payment Method</label>
                        <select
                          value={aiFormPayMethod}
                          onChange={e => setAiFormPayMethod(e.target.value as any)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-sm text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                        >
                          <option value="UPI">UPI</option>
                          <option value="Cash">Cash</option>
                          <option value="Card">Card</option>
                        </select>
                      </div>
                    </div>

                    {!aiError && aiConfidence !== 0 && (
                      <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 bg-slate-50 dark:bg-neutral-950 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-neutral-800">
                        
                        <span className="text-indigo-600 dark:text-indigo-400">{aiConfidence}% Confidence</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Buttons */}
              {!aiLoading && (
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-neutral-800">
                  <button
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    id="confirm_ai_tx"
                    onClick={handleSaveAiTransaction}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Save parsed ledger record
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adjust Budgets Limit Modal */}
      <AnimatePresence>
        {isEditingBudget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-800 shadow-xl w-full max-w-md p-6 relative flex flex-col justify-between"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">
                    Update Monthly Budgets
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditingBudget(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="py-4 space-y-3.5">
                {STANDARD_CATEGORIES.map(category => (
                  <div key={category} className="flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">{category}</span>
                    <div className="relative w-36">
                      <span className="absolute left-3.5 top-1.5 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        value={editedBudgets[category] ?? 0}
                        onChange={e => setEditedBudgets(prev => ({ ...prev, [category]: Number(e.target.value) }))}
                        className="w-full pl-7 pr-3 py-1 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-xs font-semibold text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-neutral-800">
                <button
                  onClick={() => setIsEditingBudget(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBudgets}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Save ceilings
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
