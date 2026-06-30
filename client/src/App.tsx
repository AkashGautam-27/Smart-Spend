import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TransactionProvider, useTransactions } from './context/TransactionContext';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Ledger from './pages/Ledger';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import OTPVerification from './pages/OTPVerification';
import VoiceAssistant from './components/VoiceAssistant';
import {
  Wallet,
  LayoutDashboard,
  BookOpen,
  LogOut,
  Sun,
  Moon,
  X,
  BellRing,
  Sparkles,
  Menu,
  ChevronLeft,
  Shield,
  User,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { authState, logout } = useAuth();
  const { budgetAlerts, clearAlerts } = useTransactions();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'ledger' | 'reports' | 'admin' | 'profile'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage or default to light mode
    return localStorage.getItem('smartspend_theme') === 'dark';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderMiniAvatar = () => {
    const user = authState.user;
    if (!user) return null;
    const name = user.name;
    const initials = name ? name.charAt(0).toUpperCase() : 'U';
    const avatar = user.avatar;

    if (!avatar) {
      return (
        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-indigo-600 text-white font-extrabold text-xs shrink-0 shadow-xs">
          {initials}
        </div>
      );
    }

    if (avatar.startsWith('bg-gradient-')) {
      return (
        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-xs ${avatar}`}>
          {initials}
        </div>
      );
    }

    return (
      <img
        src={avatar}
        alt="Avatar"
        referrerPolicy="no-referrer"
        className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-neutral-800 shrink-0 shadow-xs"
      />
    );
  };

  // Initialize and apply Dark Mode theme classes
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('smartspend_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('smartspend_theme', 'light');
    }
  }, [isDarkMode]);

  // Handle loading states
  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-neutral-950 text-slate-800 dark:text-neutral-200 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="text-center">
            <h3 className="font-bold text-sm">SmartSpend</h3>
            <p className="text-xs text-slate-400 mt-1">Booting full-stack financial workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated? Show Registries / Sign In screen
  if (!authState.user) {
    return <Auth />;
  }

  // Not verified? Block access and request OTP verification
  if (!authState.user.isVerified) {
    return <OTPVerification />;
  }

  return (
    <div id="app_workspace" className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-slate-800 dark:text-neutral-100 flex relative">
      
      {/* Floating real-time budget toast notification overlays */}
      <div className="fixed top-5 right-5 z-50 space-y-3 font-sans w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {budgetAlerts.map((alert, idx) => (
            <motion.div
              id={`toast_alert_${idx}`}
              key={idx}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="p-4 bg-white dark:bg-neutral-900 border-l-4 border-amber-500 rounded-xl shadow-lg flex items-start gap-3 border border-slate-100 dark:border-neutral-800 pointer-events-auto"
            >
              <div className="p-1 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-lg">
                <BellRing className="h-4 w-4" />
              </div>
              <div className="flex-grow">
                <h4 className="text-xs font-bold text-slate-800 dark:text-neutral-200">Budget Warning!</h4>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  {alert}
                </p>
              </div>
              <button
                onClick={clearAlerts}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Navigation Sidebar */}
      <aside
        className={`bg-white dark:bg-neutral-900 border-r border-slate-100 dark:border-neutral-900 flex-col justify-between hidden md:flex transition-all duration-300 relative z-30 font-sans ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-neutral-900">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
                <Wallet className="h-5 w-5" />
              </div>
              {!isSidebarCollapsed && (
                <span className="font-heading font-extrabold text-base tracking-tight bg-gradient-to-r from-slate-900 to-indigo-650 dark:from-neutral-100 dark:to-neutral-300 bg-clip-text text-transparent">
                  SmartSpend
                </span>
              )}
            </div>

            {/* Collapse toggle button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-850 rounded-lg select-none cursor-pointer"
            >
              <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Nav Rail Items */}
          <nav className="p-4 space-y-1.5 pb-6">
            <button
              id="sidebar_btn_dashboard"
              onClick={() => setCurrentPage('dashboard')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                currentPage === 'dashboard'
                  ? 'bg-indigo-50/70 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 border border-transparent hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              {!isSidebarCollapsed && <span>Overview Dashboard</span>}
            </button>

            <button
              id="sidebar_btn_ledger"
              onClick={() => setCurrentPage('ledger')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                currentPage === 'ledger'
                  ? 'bg-indigo-50/70 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 border border-transparent hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              {!isSidebarCollapsed && <span>Transaction Ledger</span>}
            </button>

            <button
              id="sidebar_btn_reports"
              onClick={() => setCurrentPage('reports')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                currentPage === 'reports'
                  ? 'bg-indigo-50/70 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 border border-transparent hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              <Layers className="h-4 w-4" />
              {!isSidebarCollapsed && <span>Reports & Insights</span>}
            </button>

            <button
              id="sidebar_btn_profile"
              onClick={() => setCurrentPage('profile')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                currentPage === 'profile'
                  ? 'bg-indigo-50/70 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 border border-transparent hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              <User className="h-4 w-4" />
              {!isSidebarCollapsed && <span>My Profile Settings</span>}
            </button>

            {authState.user?.role === 'admin' && (
              <button
                id="sidebar_btn_admin"
                onClick={() => setCurrentPage('admin')}
                className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                  currentPage === 'admin'
                    ? 'bg-indigo-50/70 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 font-bold'
                    : 'text-slate-500 border border-transparent hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                <Shield className="h-4 w-4" />
                {!isSidebarCollapsed && <span>User Administration</span>}
              </button>
            )}
          </nav>
        </div>

        {/* Sidebar Footer (Profile / Theme Toggle) */}
        <div className="p-4 border-t border-slate-100 dark:border-neutral-900 space-y-4">
          {/* User Display Info */}
          {!isSidebarCollapsed && (
            <button
              id="sidebar_user_footer_profile"
              onClick={() => setCurrentPage('profile')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-950/60 rounded-xl flex items-center gap-2.5 border border-slate-100 dark:border-neutral-900 hover:border-indigo-200 dark:hover:border-neutral-850 text-left transition-all cursor-pointer group"
            >
              {renderMiniAvatar()}
              <div className="truncate min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-neutral-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {authState.user?.name}
                </h4>
                <p className="text-[10px] text-slate-400 truncate">
                  {authState.user?.email}
                </p>
              </div>
            </button>
          )}

          {/* Actions panel */}
          <div className="flex flex-col gap-1">
            {/* Theme Toggle */}
            <button
              id="theme_toggle_btn"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-3 text-slate-500 hover:bg-slate-50 dark:text-neutral-400 dark:hover:bg-neutral-950 cursor-pointer"
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
              {!isSidebarCollapsed && <span>{isDarkMode ? 'Light Interface' : 'Dark Interface'}</span>}
            </button>

            {/* Logout */}
            <button
              id="logout_btn"
              onClick={logout}
              className="w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/15 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              {!isSidebarCollapsed && <span>Log Out Session</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex font-sans">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            ></motion.div>
            <motion.div
              initial={{ x: -250 }}
              animate={{ x: 0 }}
              exit={{ x: -250 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-64 bg-white dark:bg-neutral-900 h-full flex flex-col justify-between p-6 z-50 border-r border-slate-100 dark:border-neutral-850"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Wallet className="h-5 w-5 text-indigo-600" />
                    <span className="font-bold text-sm tracking-tight dark:text-white">SmartSpend</span>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-slate-400">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  <button
                    onClick={() => { setCurrentPage('dashboard'); setIsMobileMenuOpen(false); }}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-3 ${
                      currentPage === 'dashboard' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950' : 'text-slate-500'
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4" /> Overview Dashboard
                  </button>
                  <button
                    onClick={() => { setCurrentPage('ledger'); setIsMobileMenuOpen(false); }}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-3 ${
                      currentPage === 'ledger' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950' : 'text-slate-500'
                    }`}
                  >
                    <BookOpen className="h-4 w-4" /> Transaction Ledger
                  </button>
                  <button
                    onClick={() => { setCurrentPage('reports'); setIsMobileMenuOpen(false); }}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-3 ${
                      currentPage === 'reports' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950' : 'text-slate-500'
                    }`}
                  >
                    <Layers className="h-4 w-4" /> Reports & Insights
                  </button>
                  <button
                    onClick={() => { setCurrentPage('profile'); setIsMobileMenuOpen(false); }}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-3 ${
                      currentPage === 'profile' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950' : 'text-slate-500'
                    }`}
                  >
                    <User className="h-4 w-4" /> My Profile Settings
                  </button>
                  {authState.user?.role === 'admin' && (
                    <button
                      onClick={() => { setCurrentPage('admin'); setIsMobileMenuOpen(false); }}
                      className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-3 ${
                        currentPage === 'admin' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950' : 'text-slate-500'
                      }`}
                    >
                      <Shield className="h-4 w-4" /> User Administration
                    </button>
                  )}
                </nav>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-neutral-800">
                <div className="text-xs">
                  <p className="font-bold text-slate-800 dark:text-neutral-200">{authState.user?.name}</p>
                  <p className="text-[10px] text-slate-400">{authState.user?.email}</p>
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="w-full py-2 px-3 text-xs flex items-center gap-2 text-slate-500 dark:text-neutral-400"
                  >
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <button
                    onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                    className="w-full py-2 px-3 text-xs flex items-center gap-2 text-rose-500"
                  >
                    <LogOut className="h-4 w-4" /> Log Out
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Workspace Frame container */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-hidden">
        {/* Mobile Header Toolbar */}
        <header className="h-16 bg-white dark:bg-neutral-900 border-b border-slate-100 dark:border-neutral-900 px-6 flex items-center justify-between md:hidden z-20">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-1.5 text-slate-500 dark:text-neutral-300">
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-indigo-650" />
            <span className="font-bold text-sm tracking-tight dark:text-white">SmartSpend</span>
          </div>
          <div className="w-9 h-9"></div> {/* Empty spacer spacer */}
        </header>

        {/* Content canvas with page fades */}
        <main className="flex-1 p-6 pb-24 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {currentPage === 'dashboard' ? (
                <Dashboard />
              ) : currentPage === 'ledger' ? (
                <Ledger />
              ) : currentPage === 'reports' ? (
                <Reports />
              ) : currentPage === 'profile' ? (
                <Profile />
              ) : (
                <Admin />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modern bottom navigation tab bar for mobile devices */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-neutral-900/95 backdrop-blur-md border-t border-slate-200 dark:border-neutral-800/80 z-40 md:hidden pb-safe">
        <div className="flex justify-around items-center h-16 px-4">
          <button
            id="mobile_nav_btn_dashboard"
            onClick={() => setCurrentPage('dashboard')}
            className={`flex flex-col items-center justify-center gap-1 w-20 h-full transition-all cursor-pointer ${
              currentPage === 'dashboard'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                : 'text-slate-400 dark:text-neutral-500 font-medium hover:text-slate-600'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px] tracking-wide">Dashboard</span>
          </button>

          <button
            id="mobile_nav_btn_ledger"
            onClick={() => setCurrentPage('ledger')}
            className={`flex flex-col items-center justify-center gap-1 w-20 h-full transition-all cursor-pointer ${
              currentPage === 'ledger'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                : 'text-slate-400 dark:text-neutral-500 font-medium hover:text-slate-600'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-[10px] tracking-wide">Ledger</span>
          </button>

          <button
            id="mobile_nav_btn_reports"
            onClick={() => setCurrentPage('reports')}
            className={`flex flex-col items-center justify-center gap-1 w-20 h-full transition-all cursor-pointer ${
              currentPage === 'reports'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                : 'text-slate-400 dark:text-neutral-500 font-medium hover:text-slate-600'
            }`}
          >
            <Layers className="h-5 w-5" />
            <span className="text-[10px] tracking-wide">Reports</span>
          </button>

          <button
            id="mobile_nav_btn_profile"
            onClick={() => setCurrentPage('profile')}
            className={`flex flex-col items-center justify-center gap-1 w-20 h-full transition-all cursor-pointer ${
              currentPage === 'profile'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                : 'text-slate-400 dark:text-neutral-500 font-medium hover:text-slate-600'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-[10px] tracking-wide">Profile</span>
          </button>

          {authState.user?.role === 'admin' && (
            <button
              id="mobile_nav_btn_admin"
              onClick={() => setCurrentPage('admin')}
              className={`flex flex-col items-center justify-center gap-1 w-20 h-full transition-all cursor-pointer ${
                currentPage === 'admin'
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                  : 'text-slate-400 dark:text-neutral-500 font-medium hover:text-slate-600'
              }`}
            >
              <Shield className="h-5 w-5" />
              <span className="text-[10px] tracking-wide">Admin</span>
            </button>
          )}

          <button
            id="mobile_nav_theme_toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex flex-col items-center justify-center gap-1 w-20 h-full text-slate-400 dark:text-neutral-500 transition-all cursor-pointer"
          >
            {isDarkMode ? <Sun className="h-5 w-5 text-amber-500 animate-pulse" /> : <Moon className="h-5 w-5 text-indigo-500" />}
            <span className="text-[10px] tracking-wide">{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>

          <button
            id="mobile_nav_logout"
            onClick={logout}
            className="flex flex-col items-center justify-center gap-1 w-20 h-full text-rose-500/80 dark:text-rose-400/80 transition-all cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] tracking-wide">Logout</span>
          </button>
        </div>
      </div>
      <VoiceAssistant />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TransactionProvider>
        <AppContent />
      </TransactionProvider>
    </AuthProvider>
  );
}
