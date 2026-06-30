import { useState, useMemo, FormEvent } from 'react';
import { useTransactions, STANDARD_CATEGORIES } from '../context/TransactionContext';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  CreditCard,
  Trash2,
  Edit3,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { Transaction, TransactionType, PaymentMethod } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export default function Ledger() {
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    isLoading,
    voiceFilter,
    clearVoiceFilter
  } = useTransactions();

  // Ledger state options
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Form Fields
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState<number | string>('');
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formCategory, setFormCategory] = useState('Food');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPayMethod, setFormPayMethod] = useState<PaymentMethod>('Card');
  const [formError, setFormError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPayment, setFilterPayment] = useState<'all' | PaymentMethod>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Helper: Open Modal to Add/Create
  const openCreateModal = () => {
    setEditingTx(null);
    setFormDesc('');
    setFormAmount('');
    setFormType('expense');
    setFormCategory('Food');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormPayMethod('Card');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Helper: Open Modal to Edit
  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setFormDesc(tx.description);
    setFormAmount(tx.amount);
    setFormType(tx.type);
    setFormCategory(tx.category);
    setFormDate(tx.date);
    setFormPayMethod(tx.paymentMethod);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formDesc || !formAmount || !formDate) {
      setFormError('Please populate description, amount, and date.');
      return;
    }

    const txPayload = {
      description: formDesc,
      amount: Number(formAmount),
      type: formType,
      category: formType === 'income' ? 'Salary/Freelance' : formCategory,
      date: formDate,
      paymentMethod: formPayMethod
    };

    try {
      if (editingTx) {
        await updateTransaction(editingTx.id, txPayload);
      } else {
        await addTransaction(txPayload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Error occurred recording financial parameters.');
    }
  };

  const handleDelete = async (id: string, description: string) => {
    try {
      await deleteTransaction(id);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  // Advanced Filtering logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 0. Voice Filter check
      if (voiceFilter && voiceFilter.active && voiceFilter.matchingIds) {
        if (!voiceFilter.matchingIds.includes(t.id)) return false;
      }

      // 1. Text Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const descMatch = t.description.toLowerCase().includes(query);
        const catMatch = t.category.toLowerCase().includes(query);
        const pMatch = t.paymentMethod.toLowerCase().includes(query);
        if (!descMatch && !catMatch && !pMatch) return false;
      }

      // 2. Type Filter
      if (filterType !== 'all' && t.type !== filterType) return false;

      // 3. Category Filter
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;

      // 4. Payment Method
      if (filterPayment !== 'all' && t.paymentMethod !== filterPayment) return false;

      // 5. Date Boundaries
      if (filterDateFrom && t.date < filterDateFrom) return false;
      if (filterDateTo && t.date > filterDateTo) return false;

      return true;
    });
  }, [transactions, searchQuery, filterType, filterCategory, filterPayment, filterDateFrom, filterDateTo]);

  // Derived Pagination slices
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatCur = (v: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(v);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Type', 'Category', 'Payment Method', 'Amount'];
    const rows = filteredTransactions.map(t => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.type,
      t.category,
      t.paymentMethod,
      t.amount
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SmartSpend_Ledger_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    const data = filteredTransactions.map(t => ({
      'Date': t.date,
      'Description': t.description,
      'Type': t.type.toUpperCase(),
      'Category': t.category,
      'Payment Method': t.paymentMethod,
      'Amount ($)': t.amount,
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger Transactions');
    XLSX.writeFile(wb, `SmartSpend_Ledger_Sheet_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('SMARTSPEND LEDGER', 15, 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(226, 232, 240);
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 15, 26);
    doc.text(`Total Records Extracted: ${filteredTransactions.length}`, 15, 32);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Live Ledger Financial Audit Table', 15, 52);

    let currentY = 60;

    doc.setFillColor(241, 245, 249);
    doc.rect(15, currentY, 180, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text('Date', 18, currentY + 5.5);
    doc.text('Description', 42, currentY + 5.5);
    doc.text('Type', 100, currentY + 5.5);
    doc.text('Category', 125, currentY + 5.5);
    doc.text('Method', 155, currentY + 5.5);
    doc.text('Amount', 180, currentY + 5.5);

    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    
    filteredTransactions.forEach((t, i) => {
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;

        doc.setFillColor(241, 245, 249);
        doc.rect(15, currentY, 180, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('Date', 18, currentY + 5.5);
        doc.text('Description', 42, currentY + 5.5);
        doc.text('Type', 100, currentY + 5.5);
        doc.text('Category', 125, currentY + 5.5);
        doc.text('Method', 155, currentY + 5.5);
        doc.text('Amount', 180, currentY + 5.5);
        currentY += 8;
        doc.setFont('helvetica', 'normal');
      }

      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, 6.5, 'F');
      }

      doc.setDrawColor(241, 245, 249);
      doc.line(15, currentY + 6.5, 195, currentY + 6.5);

      doc.setTextColor(71, 85, 105);
      doc.text(t.date, 18, currentY + 4.5);
      
      const truncatedDesc = t.description.length > 30 ? t.description.slice(0, 28) + '..' : t.description;
      doc.text(truncatedDesc, 42, currentY + 4.5);
      
      if (t.type === 'income') {
        doc.setTextColor(16, 185, 129);
        doc.text('+ INCOME', 100, currentY + 4.5);
      } else {
        doc.setTextColor(225, 29, 72);
        doc.text('- EXPENSE', 100, currentY + 4.5);
      }
      
      doc.setTextColor(71, 85, 105);
      doc.text(t.category, 125, currentY + 4.5);
      doc.text(t.paymentMethod, 155, currentY + 4.5);

      doc.setFont('helvetica', 'bold');
      if (t.type === 'income') {
        doc.setTextColor(16, 185, 129);
      } else {
        doc.setTextColor(30, 41, 59);
      }
      doc.text(`$${t.amount.toFixed(2)}`, 180, currentY + 4.5);
      doc.setFont('helvetica', 'normal');

      currentY += 6.5;
    });

    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }
    
    currentY += 8;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, currentY, 180, 24, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, currentY, 180, 24, 'S');

    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const netSavings = totalIncome - totalExpense;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('CONSOLIDATED SUMMARY', 20, currentY + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Total Inflow Credits:  $${totalIncome.toFixed(2)}`, 20, currentY + 14);
    doc.text(`Total Outflow Debits: $${totalExpense.toFixed(2)}`, 20, currentY + 20);

    doc.setFont('helvetica', 'bold');
    doc.text(`Net Impact: $${netSavings.toFixed(2)}`, 110, currentY + 14);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Thank you for choosing SmartSpend as your premium secure auditing partner.', 20, currentY + 29);

    doc.save(`SmartSpend_Ledger_Document_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Core Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 dark:text-neutral-50 font-heading tracking-tight">
            Transaction Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 font-sans mt-0.5">
            Full audits of your incomes and outlays with complete CRUD capability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export Choices */}
          <button
            onClick={exportToPDF}
            className="px-3.5 py-2.5 bg-white dark:bg-neutral-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download PDF"
          >
            <FileText className="h-4 w-4 text-rose-500" />
            PDF
          </button>
          <button
            onClick={exportToExcel}
            className="px-3.5 py-2.5 bg-white dark:bg-neutral-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download Excel Spreadsheet"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            Excel
          </button>
          <button
            onClick={exportToCSV}
            className="px-3.5 py-2.5 bg-white dark:bg-neutral-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download CSV file"
          >
            <Download className="h-4 w-4 text-indigo-500" />
            CSV
          </button>

          <button
            id="add_tx_btn"
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-500/10 cursor-pointer flex items-center gap-1.5 transition-all font-sans"
          >
            <Plus className="h-4 w-4" />
            Modal Add
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
                  Showing {filteredTransactions.length} of {transactions.length} transactions match.
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

      {/* Collapsible Direct Quick Add Section using Framer Motion */}
      <div className="bg-slate-50 dark:bg-neutral-950/20 border border-slate-200 dark:border-neutral-800 rounded-2xl overflow-hidden font-sans">
        <button
          onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100/50 dark:hover:bg-neutral-950/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 block">Ledger Creator</span>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-neutral-100">Live Collapsible Quick Add Section</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
            <span>{isQuickAddOpen ? "Hide direct builder" : "Toggle Quick Add Direct Input"}</span>
            <motion.div
              animate={{ rotate: isQuickAddOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isQuickAddOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
            >
              <div className="p-5 space-y-4">
                {/* Transaction Choice Toggle inside add section */}
                <div id="quick_add_type_toggle" className="grid grid-cols-2 gap-2 h-9 p-0.5 bg-slate-100 dark:bg-neutral-950 rounded-xl max-w-sm">
                  <button
                    type="button"
                    onClick={() => setFormType('expense')}
                    className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      formType === 'expense'
                        ? 'bg-white text-indigo-600 shadow-md border dark:bg-neutral-900 dark:border-neutral-850'
                        : 'text-slate-400 dark:text-neutral-500'
                    }`}
                  >
                    Expense Outflow
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('income')}
                    className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      formType === 'income'
                        ? 'bg-white text-emerald-600 shadow-md border dark:bg-neutral-900 dark:border-neutral-850'
                        : 'text-slate-400 dark:text-neutral-500'
                    }`}
                  >
                    Income Inflow
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">Description</label>
                    <input
                      type="text"
                      value={formDesc}
                      onChange={e => setFormDesc(e.target.value)}
                      placeholder="e.g. Shopping Mall Buy"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-xs text-slate-900 dark:text-neutral-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/15"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">Amount (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formAmount}
                      onChange={e => setFormAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-xs text-slate-900 dark:text-neutral-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/15"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">Category</label>
                    {formType === 'expense' ? (
                      <select
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-xs text-slate-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-indigo-500/15 font-semibold"
                      >
                        {STANDARD_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        disabled
                        value="Salary / Deposited"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-950 text-xs text-slate-400"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">Date</label>
                      <input
                        type="date"
                        value={formDate}
                        onChange={e => setFormDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-xs text-slate-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-indigo-500/15"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">Payment Choice</label>
                      <select
                        value={formPayMethod}
                        onChange={e => setFormPayMethod(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-xs text-slate-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-indigo-500/15"
                      >
                        <option value="UPI font-semibold">UPI (Online)</option>
                        <option value="Cash">Cash (Hand)</option>
                        <option value="Card">Card (ATM)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-neutral-850">
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!formDesc || !formAmount || !formDate) {
                        alert('Please fill out descriptions, amount with numbers and select date.');
                        return;
                      }
                      try {
                        await addTransaction({
                          description: formDesc,
                          amount: Number(formAmount),
                          type: formType,
                          category: formType === 'income' ? 'Salary' : formCategory,
                          date: formDate,
                          paymentMethod: formPayMethod
                        });
                        // Clear form fields
                        setFormDesc('');
                        setFormAmount('');
                      } catch (err: any) {
                        alert(err.message || 'Validation error');
                      }
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    <Plus className="h-4.5 w-4.5" /> Commit Ledger Entry
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Advanced Filter Console Panel - Beautiful horizontal bento panel */}
      <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs space-y-4 font-sans">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-neutral-800/50">
          <Filter className="h-4 w-4 text-indigo-500" />
          <h4 className="text-xs font-bold text-slate-900 dark:text-neutral-200 uppercase tracking-widest">Advanced Filtering Console</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs text-slate-700 dark:text-neutral-300">
          {/* Keyword Query */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">Search Keyword</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-8 pr-3 py-2.5 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 font-semibold text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                placeholder="Description..."
              />
              <Search className="absolute left-2.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          {/* Type Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">Cashflow Type</label>
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value as any); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 font-semibold text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="all">All Flows</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
            </select>
          </div>

          {/* Category Select */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">Category</label>
            <select
              value={filterCategory}
              onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 font-semibold text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="all">All Categories</option>
              {STANDARD_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="Salary">Salary/Inflow</option>
              <option value="Freelance">Freelance/Deposit</option>
            </select>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">Method</label>
            <select
              value={filterPayment}
              onChange={e => { setFilterPayment(e.target.value as any); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 font-semibold text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="all">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
            </select>
          </div>

          {/* Date Range - From */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">Date From</label>
            <div className="relative">
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 font-semibold text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
              />
              <Calendar className="absolute left-2.5 top-3.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Date Range - To */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">Date To</label>
            <div className="relative">
              <input
                type="date"
                value={filterDateTo}
                onChange={e => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 font-semibold text-slate-900 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
              />
              <Calendar className="absolute left-2.5 top-3.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Tables & Grid */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden font-sans">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-neutral-950/20 border-b border-slate-200 dark:border-neutral-800 text-slate-400 text-[10px] font-bold tracking-wider uppercase">
                <th className="px-6 py-4">Transaction Details</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-850 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                      Fetching full database logs...
                    </div>
                  </td>
                </tr>
              ) : paginatedTransactions.length > 0 ? (
                paginatedTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/20 dark:hover:bg-neutral-950/10 transition-colors">
                    {/* Description / Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${
                          t.type === 'income'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/40'
                            : 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/40'
                        }`}>
                          {t.type === 'income' ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-neutral-100 text-[13px]">{t.description}</span>
                      </div>
                    </td>

                    {/* Category Pin */}
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-[10px] font-bold border bg-slate-50 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-300 rounded-full">
                        {t.category}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-slate-500 dark:text-neutral-400 font-semibold">
                      {t.date}
                    </td>

                    {/* Method */}
                    <td className="px-6 py-4 text-slate-500 dark:text-neutral-400 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                        {t.paymentMethod}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className={`px-6 py-4 text-right font-black text-[13px] ${
                      t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-950 dark:text-neutral-100'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{formatCur(t.amount)}
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors"
                          title="Edit transaction"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.description)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
                      <Info className="h-5 w-5" />
                      <span>No transactions matching active filter criteria.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Grid */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>
            Showing <span className="font-bold text-slate-700 dark:text-neutral-200">
              {filteredTransactions.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
            </span> to <span className="font-bold text-slate-700 dark:text-neutral-200">
              {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}
            </span> of <span className="font-bold text-slate-700 dark:text-neutral-200">
              {filteredTransactions.length}
            </span> records
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 border border-slate-200 rounded-lg bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-40 select-none cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-bold text-slate-700 dark:text-neutral-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 border border-slate-200 rounded-lg bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-40 select-none cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CRUD Transaction dialog modal (Create or Update) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-800 shadow-xl w-full max-w-md p-6 relative overflow-hidden flex flex-col justify-between"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-neutral-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">
                  {editingTx ? 'Update Transaction Entry' : 'Add New Transaction'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveTransaction} className="py-4 space-y-3.5">
                {formError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
                    {formError}
                  </div>
                )}

                {/* Transaction Type Choice toggler */}
                <div className="grid grid-cols-2 gap-2 h-9 p-0.5 bg-slate-100 dark:bg-neutral-950 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormType('expense')}
                    className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      formType === 'expense'
                        ? 'bg-white text-indigo-600 shadow-md border dark:bg-neutral-900'
                        : 'text-slate-400 dark:text-neutral-500'
                    }`}
                  >
                    Expense Outflow
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('income')}
                    className={`py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      formType === 'income'
                        ? 'bg-white text-emerald-600 shadow-md border dark:bg-neutral-900'
                        : 'text-slate-400 dark:text-neutral-500'
                    }`}
                  >
                    Income Inflow
                  </button>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Description</label>
                  <input
                    type="text"
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                    placeholder="e.g. Starbucks Coffees"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Amount Paid (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Dynamic parameters depending on type */}
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Category Selection (Only for expenses, incomes are auto salary/freelance) */}
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Category</label>
                    {formType === 'expense' ? (
                      <select
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-xs text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                      >
                        {STANDARD_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-950 text-xs text-slate-500 dark:text-neutral-400"
                        value="Salary / Deposited"
                        disabled
                      />
                    )}
                  </div>

                  {/* Date */}
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Date</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-xs text-slate-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-indigo-500/15"
                    />
                  </div>

                  {/* Method */}
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Payment Method</label>
                    <select
                      value={formPayMethod}
                      onChange={e => setFormPayMethod(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 text-xs text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                    >
                      <option value="UPI">UPI (Unified Payment)</option>
                      <option value="Cash">Cash Currency</option>
                      <option value="Card">Visa/Mastercard Card</option>
                    </select>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    {editingTx ? 'Confirm Updates' : 'Commit Ledger Entry'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
