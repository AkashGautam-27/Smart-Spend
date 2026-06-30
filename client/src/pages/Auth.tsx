import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet, Sparkles, TrendingUp, BellRing, ArrowRight } from 'lucide-react';

export default function Auth() {
  const { login, register, error, clearError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    if (!email || !password || (!isLogin && !name)) {
      setValidationError('Please populate all required fields correctly.');
      return;
    }

    setFormLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err: any) {
      console.error('Authentication process failed:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    clearError();
    setValidationError(null);
    setFormLoading(true);
    try {
      await login('demo@smartspend.com', 'DemoPassword123');
    } catch (err: any) {
      console.error('Demo authentication failed:', err);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div id="auth_page" className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col md:flex-row">
      {/* Visual & Features Column */}
      <div className="w-full md:w-1/2 bg-slate-900 text-white p-8 md:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Background decorative mesh */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-md border border-indigo-400/20">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <span className="font-sans font-bold text-xl tracking-tight bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
            SmartSpend
          </span>
        </div>

        <div className="my-12 md:my-0 max-w-md relative z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold font-sans leading-tight tracking-tight bg-gradient-to-r from-neutral-400  to-slate-700">
            Automate and Optimize Your Financial Horizon
          </h2>
          <p className="text-slate-400 mt-4 leading-relaxed font-sans text-sm">
            SmartSpend combines elegant analytics with server-side artificial intelligence to streamline expense tracking, category budgeting, and cash flows.
          </p>

          <div className="mt-8 space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-800 rounded-lg text-indigo-400 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-neutral-100 text-sm">AI OCR Receipt Scanner</h4>
                <p className="text-slate-400 text-xs mt-1">
                  Drag & drop receipt photos; digital intelligence instantly pre-fills transactions with precise extracted values.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-800 rounded-lg text-emerald-400 shadow-sm">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-neutral-100 text-sm">Real-Time Visual Reports</h4>
                <p className="text-slate-400 text-xs mt-1">
                  Donut maps analyze category spends, and sleek bar charts visualize your monthly net income against custom limits.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-800 rounded-lg text-amber-400 shadow-sm">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-neutral-100 text-sm">Smart Budgets & Threshold Alerts</h4>
                <p className="text-slate-400 text-xs mt-1">
                  Set multi-colored budget progress indicators that warn you with real-time UI cues on reaching 80% or 100% caps.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-slate-500 text-xs relative z-10 font-sans border-t border-slate-800 pt-6 mt-6 md:mt-0">
           &bull; Safe Full-Stack Architecture
        </div>
      </div>

      {/* Account Forms Column */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-neutral-100 font-sans">
              {isLogin ? 'Welcome Back To Your Books' : 'Create Your Free Ledger'}
            </h1>
            <p className="text-slate-500 dark:text-neutral-400 text-sm font-sans">
              {isLogin
                ? 'Enter your credentials below to analyze your cash flows'
                : 'Sign up to configure budgeting and dynamic OCR parsing'}
            </p>
          </div>

          {(error || validationError) && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-sans flex items-start gap-3">
              <span className="font-semibold">Error:</span>
              <span>{validationError || error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 font-sans">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Name</label>
                <input
                  type="text"
                  placeholder="Your display name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-sm"
                  disabled={formLoading}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Email Address</label>
              <input
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-sm"
                disabled={formLoading}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Password</label>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-sm"
                disabled={formLoading}
              />
            </div>

            <button
              id="auth_submit_btn"
              type="submit"
              disabled={formLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-medium shadow-sm flex items-center justify-center gap-2 text-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {formLoading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Generate Account'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-neutral-800"></div>
            <span className="flex-shrink mx-4 text-xs font-sans text-slate-400">Or continue with</span>
            <div className="flex-grow border-t border-slate-200 dark:border-neutral-800"></div>
          </div>

         

          <div className="text-center  font-sans">
            <button
              id="switch_auth_form"
              onClick={() => {
                setIsLogin(!isLogin);
                clearError();
                setValidationError(null);
              }}
              className="text-xs  text-indigo-600 hover:text-indigo-700  font-medium dark:text-indigo-400 cursor-pointer "
            >
              {isLogin ? "Don't have an account yet? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
