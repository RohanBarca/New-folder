import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Smartphone,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Lock,
} from 'lucide-react';
import authService from '../services/authService';

const OTP_RESEND_COOLDOWN_SECONDS = 30;

export default function PatientLogin({ registration = false }) {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [requestId, setRequestId] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!resendIn) return undefined;
    const timer = window.setInterval(() => {
      setResendIn((seconds) => (seconds > 0 ? seconds - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  // Handle phone input formatting (only digits, max 10)
  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
    setError('');
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.sendMobileOtp(`+91${phone}`);
      if (!response.success) {
        setError(response.error || 'Unable to send OTP. Please try again.');
        return;
      }
      setRequestId(response.request_id || '');
      setOtp('');
      setStep('otp');
      setResendIn(OTP_RESEND_COOLDOWN_SECONDS);
    } catch {
      setError('Unable to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter the 6-digit OTP sent to your phone.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyMobileOtp(`+91${phone}`, otp, requestId);
      if (!res.success) {
        setError(res.error || 'Unable to connect your MedSync account.');
        return;
      }
      navigate(registration ? '/patient/register/details' : '/patient/dashboard');
    } catch {
      setError('Unable to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const changePhone = () => {
    setError('');
    setOtp('');
    setRequestId('');
    setResendIn(0);
    setStep('phone');
  };

  const handleResend = async () => {
    if (resendIn || loading) return;
    await handleSendOtp();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FBFC] text-[#17385E] selection:bg-[#18A6A1] selection:text-white relative overflow-hidden">
      {/* Top Header */}
      <header className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            to="/patient/entry"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#17385E]/75 hover:text-[#18A6A1] transition-colors py-2 px-3 rounded-full hover:bg-white/80 border border-transparent hover:border-slate-200/80"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>

          <Link to="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] flex items-center justify-center shadow-md shadow-[#18A6A1]/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="flex items-baseline">
              <span className="text-xl font-extrabold tracking-tight text-[#17385E]">
                Med<span className="text-[#18A6A1]">Sync</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#18A6A1] ml-0.5"></span>
            </div>
          </Link>

          <div className="w-16 hidden sm:block"></div>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-soft-lg space-y-7">
          
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#EAFafa] border border-[#18A6A1]/20 flex items-center justify-center text-[#18A6A1] mx-auto shadow-soft-sm">
              <Smartphone className="w-8 h-8 stroke-[2]" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#17385E] tracking-tight">
              {step === 'phone' ? 'Continue with Mobile Number' : 'Enter your OTP'}
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              {step === 'phone'
                ? 'Verify your mobile number securely to continue with MedSync.'
                : `Enter the 6-digit code sent to +91 ${phone}.`}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 animate-fadeIn">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-1.5">
              <label htmlFor="phone-input" className="text-xs font-bold text-[#17385E]">
                Indian Mobile Number
              </label>
              <div className="flex rounded-2xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#18A6A1]/40 focus-within:border-[#18A6A1] transition-all">
                <span className="inline-flex items-center px-4 bg-slate-50 border-r border-slate-200 text-slate-600 font-bold text-sm select-none">
                  🇮🇳 +91
                </span>
                <input
                  id="phone-input"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="Enter 10-digit number"
                  autoFocus
                  autoComplete="tel"
                  className="w-full px-4 py-3.5 bg-white text-[#17385E] text-base font-bold placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                />
              </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  A one-time password will be sent securely to this number.
                </p>
              </div>

              <button
                id="send-otp-btn"
                type="submit"
                disabled={loading || phone.length !== 10}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-base font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B] shadow-md shadow-[#18A6A1]/20 hover:shadow-teal-glow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Sending OTP...</span></> : <><span>Send OTP</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="otp-input" className="text-xs font-bold text-[#17385E]">One-time password</label>
                <input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-[#17385E] text-lg font-bold tracking-[0.35em] text-center focus:outline-none focus:ring-2 focus:ring-[#18A6A1]/40 focus:border-[#18A6A1]"
                />
              </div>
              <button
                id="verify-otp-btn"
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-base font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B] shadow-md shadow-[#18A6A1]/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying...</span></> : <><span>Verify OTP</span><CheckCircle2 className="w-4 h-4" /></>}
              </button>
              <div className="flex items-center justify-between text-xs font-bold">
                <button type="button" onClick={changePhone} className="text-[#17385E] hover:text-[#18A6A1]">Change number</button>
                <button type="button" onClick={handleResend} disabled={resendIn > 0 || loading} className="text-[#18A6A1] hover:text-[#148F8B] disabled:text-slate-400">
                  {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          <div className="pt-4 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs text-slate-400 font-medium">Or continue with</p>
            <Link
              to="/patient/register"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-full text-xs font-bold text-[#17385E] bg-slate-50 hover:bg-[#EAFafa] border border-slate-200 hover:border-[#18A6A1] transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-[#18A6A1]" />
              <span>Continue with ABHA (Demo)</span>
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white/50">
        © 2026 MedSync. Phone-based patient access.
      </footer>
    </div>
  );
}
