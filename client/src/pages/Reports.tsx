import { useState, useEffect, useMemo } from 'react';
import { useTransactions } from '../context/TransactionContext';
import { STANDARD_CATEGORIES } from '../context/TransactionContext';
import {
  Sparkles,
  AlertTriangle,
  AlertCircle,
  FileText,
  Download,
  Calendar,
  Loader,
  RefreshCw,
  HelpCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

// Local interfaces for Advisor response
interface LowBudgetAlert {
  category: string;
  status: 'danger' | 'warning' | 'info';
  message: string;
}

interface AdvisorData {
  lowBudgets: LowBudgetAlert[];
  savingTips: string[];
  weeklyAnalysis: {
    summary: string;
    topExpenseCategory: string;
    advice: string;
  };
  monthlyAnalysis: {
    summary: string;
    savingsForecast: string;
  };
}

export default function Reports() {
  const { transactions, budgetStatuses, budgets, getAdvisorInsights } = useTransactions();

  // Date filters for Report Generator
  const [reportRange, setReportRange] = useState<'weekly' | 'monthly' | 'prior' | 'year' | 'custom'>('monthly');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // AI Advisor state
  const [advisorInsights, setAdvisorInsights] = useState<AdvisorData | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Success indicators for downloads
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Default date ranges logic
  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    if (reportRange === 'weekly') {
      const pastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      setFromDate(pastWeek.toISOString().split('T')[0]);
      setToDate(today.toISOString().split('T')[0]);
    } else if (reportRange === 'monthly') {
      const firstDay = new Date(currentYear, currentMonth, 1);
      setFromDate(firstDay.toISOString().split('T')[0]);
      setToDate(today.toISOString().split('T')[0]);
    } else if (reportRange === 'prior') {
      const firstDayPrior = new Date(currentYear, currentMonth - 1, 1);
      const lastDayPrior = new Date(currentYear, currentMonth, 0);
      setFromDate(firstDayPrior.toISOString().split('T')[0]);
      setToDate(lastDayPrior.toISOString().split('T')[0]);
    } else if (reportRange === 'year') {
      const firstDayYear = new Date(currentYear, 0, 1);
      setFromDate(firstDayYear.toISOString().split('T')[0]);
      setToDate(today.toISOString().split('T')[0]);
    }
  }, [reportRange]);

  // Apply manual / custom date bounds check to report transactions
  const reportTransactions = useMemo(() => {
    if (!fromDate || !toDate) return transactions;
    const start = new Date(fromDate + 'T00:00:00');
    const end = new Date(toDate + 'T23:59:59');

    return transactions.filter(t => {
      const baseDate = t.date.includes('T') ? t.date.split('T')[0] : t.date;
      const d = new Date(baseDate + 'T00:00:00');
      return d >= start && d <= end;
    });
  }, [transactions, fromDate, toDate]);

  // Compute metric sums of the filtered report transactions
  const reportMetrics = useMemo(() => {
    const incomes = reportTransactions.filter(t => t.type === 'income');
    const expenses = reportTransactions.filter(t => t.type === 'expense');

    const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      count: reportTransactions.length,
      incomeCount: incomes.length,
      expenseCount: expenses.length
    };
  }, [reportTransactions]);

  // Trigger Advisor Insight generation
  const fetchAiAdvice = async (force: boolean = false) => {
    if (advisorInsights && !force) return;
    setIsAiLoading(true);
    setAiError(null);

    try {
      const data = await getAdvisorInsights();
      if (data) {
        setAdvisorInsights(data);
        localStorage.setItem('smartspend_ai_cache', JSON.stringify(data));
        localStorage.setItem('smartspend_ai_cache_time', Date.now().toString());
      } else {
        throw new Error('AI Coach did not return data. Please check your system logs.');
      }
    } catch (e: any) {
      console.error(e);
      setAiError(e?.message || 'Gemini system failed. Please check your API credentials.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Check cache on load
  useEffect(() => {
    const cached = localStorage.getItem('smartspend_ai_cache');
    const cachedTime = localStorage.getItem('smartspend_ai_cache_time');
    
    if (cached && cachedTime) {
      // 1 hour cache validation
      if (Date.now() - Number(cachedTime) < 3600000) {
        setAdvisorInsights(JSON.parse(cached));
        return;
      }
    }
    // Automatically trigger on first load if no cache
    fetchAiAdvice();
  }, []);

  // Temporary Toast controller
  const triggerSuccess = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => {
      setDownloadSuccess(null);
    }, 4500);
  };

  // --- Export Actions ---

  // 1. PDF Statement Export
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const leftMargin = 15;

      // 1. Header & Title Block
      doc.setFillColor(79, 70, 229); // Royal Indigo primary color
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('SMARTSPEND WEALTH STATEMENT', leftMargin, 16);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, leftMargin, 24);
      doc.text(`Statement Coverage Period: ${fromDate} to ${toDate}`, leftMargin, 30);

      // 2. Summary Dashboard Metrics Grid
      doc.setFillColor(248, 250, 252); // soft slate bg
      doc.rect(leftMargin, 50, 180, 28, 'F');
      
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('STATEMENT FINANCIAL SUMMARY', leftMargin + 5, 56);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Total Income: $${reportMetrics.totalIncome.toFixed(2)}`, leftMargin + 5, 64);
      doc.text(`Total Expenses: $${reportMetrics.totalExpense.toFixed(2)}`, leftMargin + 5, 70);
      doc.text(`Net Wealth Flow: $${reportMetrics.netSavings.toFixed(2)}`, leftMargin + 90, 64);
      doc.text(`Savings Rate: ${reportMetrics.savingsRate.toFixed(1)}%`, leftMargin + 90, 70);

      // 3. Transactions Table Header
      let yPosition = 90;
      doc.setFillColor(51, 65, 85);
      doc.rect(leftMargin, yPosition, 180, 8, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Date', leftMargin + 2, yPosition + 5);
      doc.text('Merchant / Description', leftMargin + 25, yPosition + 5);
      doc.text('Category', leftMargin + 85, yPosition + 5);
      doc.text('Method', leftMargin + 115, yPosition + 5);
      doc.text('Type', leftMargin + 140, yPosition + 5);
      doc.text('Amount', leftMargin + 165, yPosition + 5);

      // 4. Fill rows
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);

      const items = [...reportTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      items.forEach((t, index) => {
        // Prevent overflow
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;

          // Redraw header on new page
          doc.setFillColor(51, 65, 85);
          doc.rect(leftMargin, yPosition, 180, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text('Date', leftMargin + 2, yPosition + 5);
          doc.text('Merchant / Description', leftMargin + 25, yPosition + 5);
          doc.text('Category', leftMargin + 85, yPosition + 5);
          doc.text('Method', leftMargin + 115, yPosition + 5);
          doc.text('Type', leftMargin + 140, yPosition + 5);
          doc.text('Amount', leftMargin + 165, yPosition + 5);
          
          yPosition += 8;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
        }

        yPosition += 7;
        
        // Alternating background
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(leftMargin, yPosition - 5, 180, 7, 'F');
        }

        const amt = t.amount;
        const color = t.type === 'income' ? [16, 185, 129] : [244, 63, 94]; // Green vs Rose
        
        doc.text(t.date, leftMargin + 2, yPosition);
        
        // Truncate description if too long
        const cleanDesc = t.description.length > 30 ? t.description.substring(0, 28) + '..' : t.description;
        doc.text(cleanDesc, leftMargin + 25, yPosition);
        doc.text(t.category, leftMargin + 85, yPosition);
        doc.text(t.paymentMethod || 'Cash', leftMargin + 115, yPosition);
        doc.text(t.type === 'income' ? 'INCOME' : 'EXPENSE', leftMargin + 140, yPosition);

        // Print amount with proper color
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${amt.toFixed(2)}`, leftMargin + 165, yPosition);
        
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
      });

      // 5. Save the file
      doc.save(`SmartSpend_Statement_${fromDate}_to_${toDate}.pdf`);
      triggerSuccess('Wealth PDF Statement generated and downloaded successfully!');
    } catch (err: any) {
      console.error(err);
      alert('Failed to generate PDF: ' + err.message);
    }
  };

  // 2. Excel Statement Export
  const handleExportExcel = () => {
    try {
      // Create Sheet data array
      const sheetData = reportTransactions.map(t => ({
        'Date': t.date,
        'Merchant/Description': t.description,
        'Category': t.category,
        'Payment Method': t.paymentMethod || 'Cash',
        'Record Type': t.type.toUpperCase(),
        'Amount (USD)': t.amount,
      }));

      // Summaries array to append at the bottom
      const summaryRows = [
        {}, // Spacer
        { 'Date': 'SUMMARY STATISTICS', 'Merchant/Description': '' },
        { 'Date': 'Total Income', 'Merchant/Description': reportMetrics.totalIncome },
        { 'Date': 'Total Expenses', 'Merchant/Description': reportMetrics.totalExpense },
        { 'Date': 'Net Wealth Flow', 'Merchant/Description': reportMetrics.netSavings },
        { 'Date': 'Savings Rate (%)', 'Merchant/Description': reportMetrics.savingsRate.toFixed(1) },
        { 'Date': 'Transaction Count', 'Merchant/Description': reportMetrics.count }
      ];

      // Combine arrays
      const combinedData = [...sheetData, ...summaryRows];

      // Build Sheet and Workbook
      const worksheet = XLSX.utils.json_to_sheet(combinedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Wealth Ledger');

      // Save XLSX file
      XLSX.writeFile(workbook, `SmartSpend_Report_${fromDate}_to_${toDate}.xlsx`);
      triggerSuccess('Excel Spreadsheet exported and saved successfully!');
    } catch (err: any) {
      console.error(err);
      alert('Excel conversion error: ' + err.message);
    }
  };

  // 3. CSV Export
  const handleExportCSV = () => {
    try {
      const headers = ['ID', 'Date', 'Description', 'Category', 'Payment Method', 'Type', 'Amount'];
      const rows = reportTransactions.map(t => [
        t.id,
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        t.category,
        t.paymentMethod || 'Cash',
        t.type,
        t.amount.toString()
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `SmartSpend_Dump_${fromDate}_to_${toDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      triggerSuccess('Prinstine CSV Data dump exported successfully!');
    } catch (err: any) {
      console.error(err);
      alert('CSV Export error: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-neutral-900 pb-5">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-500" />
            Wealth Reports & Insights
          </h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium mt-1">
            Access deep generative budget advice and create professional-grade multi-format financial statements.
          </p>
        </div>

        {/* Global indicator */}
        <button
          onClick={() => fetchAiAdvice(true)}
          disabled={isAiLoading}
          className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100/85 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl text-xs font-bold border border-indigo-100 dark:border-indigo-900/40 hover:border-indigo-200 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60 shrink-0"
        >
          {isAiLoading ? (
            <Loader className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Re-Analyze Ledger with AI
        </button>
      </div>

      {/* Success Notification Alert */}
      <AnimatePresence>
        {downloadSuccess && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/35 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2 font-bold"
          >
            <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
            <span>{downloadSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COMPONENT: AI FINANCIAL COACH & ADVISOR (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-slate-150 dark:border-neutral-800 rounded-2xl shadow-sm p-6 space-y-6 relative overflow-hidden">
            {/* Top Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-950 dark:text-neutral-100">
                  AI Budget Coach & Wealth Advisor
                </h3>
              </div>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/30">
                ACTIVE
              </span>
            </div>

            {/* Coach Processing / Empty States */}
            {isAiLoading && (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-3.5">
                <Loader className="h-9 w-9 text-indigo-600 animate-spin" />
                <p className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                  AI is auditing your expenses ledger...
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Reviewing budget ceilings, payment methods, transaction volumes, and forecasting net savings.
                </p>
              </div>
            )}

            {!isAiLoading && aiError && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-150 dark:border-amber-900/40 rounded-2xl space-y-3">
                <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-400 text-xs font-semibold">
                  <AlertTriangle className="h-5 w-5 mt-0.5" />
                  <div>
                    <h5 className="font-bold">Advisor System Hold</h5>
                    <p className="mt-1 leading-relaxed text-slate-600 dark:text-neutral-400 font-medium">
                      {aiError}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => fetchAiAdvice(true)}
                  className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 text-[10px] font-bold rounded-lg cursor-pointer"
                >
                  Retry Analysis
                </button>
              </div>
            )}

            {/* Advisor Content Results */}
            {!isAiLoading && !aiError && advisorInsights && (
              <div className="space-y-6">
                
                {/* 1. Low Budgets Warning Arena */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                    Real-time Ceiling Warnings
                  </h4>
                  {advisorInsights.lowBudgets.length === 0 ? (
                    <div className="p-3 bg-emerald-50/55 dark:bg-emerald-950/15 border border-emerald-100/50 dark:border-emerald-900/20 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span>All category budget limits are healthy! Great job sticking to your boundaries.</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {advisorInsights.lowBudgets.map((b, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 border rounded-xl text-xs flex items-start gap-3 transition-colors ${
                            b.status === 'danger'
                              ? 'bg-rose-50/65 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-400'
                              : 'bg-amber-50/65 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-400'
                          }`}
                        >
                          <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${b.status === 'danger' ? 'text-rose-500' : 'text-amber-500'}`} />
                          <div className="space-y-0.5">
                            <span className="font-bold uppercase tracking-wider text-[10px]">
                              {b.category} • {b.status.toUpperCase()}
                            </span>
                            <p className="text-slate-700 dark:text-neutral-300 font-medium leading-relaxed mt-1">
                              {b.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Personalized Savings Advice List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
                    High-Value Savings Tips
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {advisorInsights.savingTips.map((tip, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 dark:bg-neutral-950/45 border border-slate-100 dark:border-neutral-800/80 rounded-xl flex items-start gap-3"
                      >
                        <div className="h-5 w-5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {idx + 1}
                        </div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-neutral-300 leading-relaxed">
                          {tip}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Weekly & Monthly Deep Analysis Bento cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Weekly card */}
                  <div className="p-4 bg-slate-50/65 dark:bg-neutral-950/30 border border-slate-100 dark:border-neutral-800/70 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                      <TrendingDown className="h-4 w-4" />
                      Weekly Analysis
                    </div>
                    <p className="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed font-medium">
                      {advisorInsights.weeklyAnalysis.summary}
                    </p>
                    <div className="border-t border-slate-150 dark:border-neutral-800 pt-2 text-[10px] text-slate-400 font-bold space-y-1">
                      <div>Top Spend Class: <span className="text-indigo-600 dark:text-indigo-400">{advisorInsights.weeklyAnalysis.topExpenseCategory}</span></div>
                      <div>Advisor Rule: <span className="text-slate-600 dark:text-neutral-300">{advisorInsights.weeklyAnalysis.advice}</span></div>
                    </div>
                  </div>

                  {/* Monthly card */}
                  <div className="p-4 bg-slate-50/65 dark:bg-neutral-950/30 border border-slate-100 dark:border-neutral-800/70 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <TrendingUp className="h-4 w-4" />
                      Monthly Trend
                    </div>
                    <p className="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed font-medium">
                      {advisorInsights.monthlyAnalysis.summary}
                    </p>
                    <div className="border-t border-slate-150 dark:border-neutral-800 pt-2 text-[10px] text-slate-400 font-bold">
                      Savings Forecast: <span className="text-emerald-600 dark:text-emerald-400">{advisorInsights.monthlyAnalysis.savingsForecast}</span>
                    </div>
                  </div>
                </div>

                {/* Footnote */}
                <div className="text-[10px] text-slate-400 text-center font-bold">
                  Last updated via AI : {new Date().toLocaleTimeString()}
                </div>

              </div>
            )}
          </div>
        </div>

        {/* RIGHT COMPONENT: FINANCIAL STATEMENT GENERATOR (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-slate-150 dark:border-neutral-800 rounded-2xl shadow-sm p-6 space-y-6">
            
            {/* Header */}
            <div>
              <h3 className="text-sm font-bold text-slate-950 dark:text-neutral-100">
                Financial Statement Generator
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Filter and export structured transaction logs as professional formats.
              </p>
            </div>

            {/* Range Presets Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-400  uppercase tracking-wider block">
                Select Report Period
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'weekly', name: 'Last 7 Days (Weekly)' },
                  { id: 'monthly', name: 'This Month' },
                  { id: 'prior', name: 'Last Month' },
                  { id: 'year', name: 'This Year' },
                  { id: 'custom', name: 'Custom Range 📅' },
                ].map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setReportRange(preset.id as any)}
                    className={`p-2 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer ${
                      reportRange === preset.id
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400'
                        : 'bg-white border-slate-150 hover:bg-slate-50 text-slate-600 dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-850'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Range Inputs (collapsible if custom) */}
            {reportRange === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="grid grid-cols-2 gap-3.5 bg-slate-50 dark:bg-neutral-950 p-3.5 border border-slate-150 dark:border-neutral-800/70 rounded-xl"
              >
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-550 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-550 font-semibold"
                  />
                </div>
              </motion.div>
            )}

            {/* Date bounds summary readout */}
            <div className="bg-slate-50 dark:bg-neutral-950/50 rounded-xl p-3 border border-slate-100 dark:border-neutral-850/70 text-[11px] font-semibold text-slate-500 dark:text-neutral-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Selected Interval:</span>
                <span className="text-slate-800 dark:text-neutral-200">
                  {fromDate || 'Unset'} to {toDate || 'Unset'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Matching Ledger Records:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {reportMetrics.count} transactions ({reportMetrics.incomeCount} In, {reportMetrics.expenseCount} Out)
                </span>
              </div>
            </div>

            {/* Live Metrics Preview for Statement */}
            <div className="border border-slate-150 dark:border-neutral-800 rounded-2xl p-4 space-y-3 bg-gradient-to-br from-indigo-50/20 via-white to-slate-50/30 dark:from-indigo-950/10 dark:via-neutral-900 dark:to-neutral-950">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Calculated Metrics Preview
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Statement Income</span>
                  <span className="text-sm font-extrabold text-emerald-500">
                    ${reportMetrics.totalIncome.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Statement Expenses</span>
                  <span className="text-sm font-extrabold text-rose-500">
                    ${reportMetrics.totalExpense.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Net Flow</span>
                  <span className={`text-sm font-extrabold ${reportMetrics.netSavings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    ${reportMetrics.netSavings.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Savings Rate</span>
                  <span className="text-sm font-extrabold text-indigo-500">
                    {reportMetrics.savingsRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Download Grid Buttons */}
            <div className="space-y-3 pt-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Available Document Formats
              </label>

              {/* 1. PDF export button */}
              <button
                id="export_btn_pdf"
                onClick={handleExportPDF}
                disabled={reportMetrics.count === 0}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-500/10 transition-all flex items-center justify-between cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5" />
                  Generate Wealth Statement PDF
                </span>
                <Download className="h-4 w-4 opacity-75 group-hover:translate-y-0.5 transition-transform" />
              </button>

              <div className="grid grid-cols-2 gap-3">
                {/* 2. Excel export button */}
                <button
                  id="export_btn_excel"
                  onClick={handleExportExcel}
                  disabled={reportMetrics.count === 0}
                  className="py-3 px-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-850 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 shrink-0 text-emerald-500" />
                  Export Excel (XLSX)
                </button>

                {/* 3. CSV export button */}
                <button
                  id="export_btn_csv"
                  onClick={handleExportCSV}
                  disabled={reportMetrics.count === 0}
                  className="py-3 px-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-850 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 shrink-0 text-amber-500" />
                  Export Raw CSV
                </button>
              </div>

              {reportMetrics.count === 0 && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold text-center mt-1">
                  ⚠️ No records found in selected range. Add transactions or expand dates.
                </p>
              )}
            </div>

            {/* Tip sheet */}
            <div className="p-3 bg-slate-50 dark:bg-neutral-950/40 rounded-xl border border-slate-100 dark:border-neutral-850/50 flex gap-2">
              <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                <span className="font-extrabold text-slate-500 dark:text-neutral-300">Statement Compliance:</span> SmartSpend statements are generated client-side using localized data, complying with financial auditing policies. Let PDF exports serve as verified expenditure sheets.
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
