import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet, LogOut, ArrowRight, ShieldCheck } from 'lucide-react';

export default function OTPVerification() {
  const { authState, verifyOtp, resendOtp, logout, error, clearError } = useAuth();
  const user = authState.user;
  const userEmail = user?.email || '';

  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [formLoading, setFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resend cooldown timer state
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Cooldown countdown timer
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);



  // Clear local alerts automatically
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleInputChange = (index: number, value: string) => {
    // Only accept numeric inputs
    if (value && !/^\d$/.test(value)) return;

    const newValues = [...otpValues];
    newValues[index] = value;
    setOtpValues(newValues);
    setErrorMessage(null);
    clearError();

    // Move focus forward if value entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace to move focus backward
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) {
      setErrorMessage('Please paste a valid 6-digit verification code.');
      return;
    }

    const digits = pastedData.split('');
    setOtpValues(digits);
    inputRefs.current[5]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    clearError();

    const fullOtp = otpValues.join('');
    if (fullOtp.length < 6) {
      setErrorMessage('Please complete the 6-digit OTP code.');
      return;
    }

    setFormLoading(true);
    try {
      await verifyOtp(userEmail, fullOtp);
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setErrorMessage(null);
    clearError();

    try {
      await resendOtp(userEmail);
      setSuccessMessage('A new verification code has been dispatched.');
      setCooldown(30); // 30 seconds cooldown
      setOtpValues(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request new code.');
    }
  };

  return (
    <div id="otp_verification_page" className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4 md:p-8 font-sans transition-colors duration-300">
      <div className="w-full max-w-md bg-white/75 dark:bg-neutral-900/80 backdrop-blur-md border border-slate-200/60 dark:border-neutral-800/80 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Mesh decor */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="p-2 bg-indigo-600 rounded-xl text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg dark:text-neutral-100 tracking-tight">SmartSpend</span>
        </div>

        {/* Header info */}
        <div className="space-y-2 mb-8">
          <h1 className="text-xl font-black text-slate-800 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-500 shrink-0" />
            Security Verification
          </h1>
          <p className="text-xs text-slate-450 dark:text-neutral-400 leading-relaxed">
            We sent a 6-digit verification code to <strong className="text-slate-600 dark:text-neutral-300">{userEmail}</strong>. Please input the code below.
          </p>
        </div>

        {/* Alerts */}
        {(errorMessage || error) && (
          <div className="p-3.5 mb-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/35 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium">
            {errorMessage || error}
          </div>
        )}
        {successMessage && (
          <div className="p-3.5 mb-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/35 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            {successMessage}
          </div>
        )}

        {/* OTP Form */}
        <form onSubmit={handleVerify} className="space-y-8">
          <div className="flex justify-between items-center gap-2.5">
            {otpValues.map((val, idx) => (
              <input
                key={idx}
                type="text"
                maxLength={1}
                value={val}
                onChange={e => handleInputChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                ref={el => { inputRefs.current[idx] = el; }}
                className="w-12 h-14 text-center text-lg font-extrabold bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-neutral-100 transition-all shadow-xs"
                disabled={formLoading}
              />
            ))}
          </div>

          <div className="space-y-3">
            <button
              id="otp_verify_btn"
              type="submit"
              disabled={formLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2 text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {formLoading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Verify Code
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                id="otp_resend_btn"
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                className={`font-semibold transition-colors cursor-pointer ${
                  cooldown > 0
                    ? 'text-slate-400 dark:text-neutral-600 cursor-not-allowed'
                    : 'text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300'
                }`}
              >
                {cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Verification Code'}
              </button>

              <button
                type="button"
                onClick={logout}
                className="font-semibold text-rose-500 hover:text-rose-650 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Log Out
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
