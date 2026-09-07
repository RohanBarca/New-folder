import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, ArrowRight, AlertCircle, RefreshCw, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import abhaService from '../../services/abhaService';

export default function OtpVerification({ identifier, type, txnId, onOtpVerified, onChangeIdentifier }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [countdown, setCountdown] = useState(30);

  const inputRefs = useRef([]);

  // Auto focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index, value) => {
    // Only accept numeric
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const newOtp = [...otp];
    newOtp[index] = cleanVal ? cleanVal.slice(-1) : '';
    setOtp(newOtp);
    if (error) setError('');

    // If input entered, advance to next box
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || '';
      }
      setOtp(newOtp);
      const nextIdx = Math.min(pasted.length, 5);
      inputRefs.current[nextIdx]?.focus();
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join('');

    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the OTP.');
      return;
    }

    setLoading(true);
    setError('');
    setResendMessage('');

    try {
      const result = await abhaService.verifyOtp(identifier, fullOtp, txnId);
      if (result.success) {
        onOtpVerified(result.abhaProfile);
      } else {
        setError(result.message || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      const res = await abhaService.resendOtp(identifier, type);
      if (res.success) {
        setResendMessage('A fresh OTP has been sent.');
        setCountdown(30);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(res.message || 'Unable to resend OTP.');
      }
    } catch (err) {
      setError('Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  // Quick helper to fill test OTP 180706
  const fillTestOtp = () => {
    setOtp(['1', '8', '0', '7', '0', '6']);
    setError('');
    inputRefs.current[5]?.focus();
  };

  return (
    <div className="space-y-6">
      
      {/* Heading */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-[#EAFafa] border border-[#18A6A1]/30 flex items-center justify-center text-[#18A6A1] mx-auto shadow-soft-sm">
          <KeyRound className="w-6 h-6 stroke-[2]" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17385E] tracking-tight">
          Verify your identity
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 font-normal max-w-sm mx-auto">
          Enter the 6-digit OTP sent to your registered mobile number linked with <span className="font-bold text-[#17385E]">{identifier}</span>.
        </p>

        <button
          type="button"
          onClick={onChangeIdentifier}
          className="text-xs font-semibold text-[#18A6A1] hover:underline"
        >
          Change {type === 'number' ? 'ABHA Number' : 'ABHA Address'}
        </button>
      </div>

      {/* Error / Resend Alerts */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 text-left animate-shake">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {resendMessage && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 text-left">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{resendMessage}</span>
        </div>
      )}

      {/* 6-Digit OTP Form */}
      <form onSubmit={handleVerify} className="space-y-6">
        
        {/* OTP Input Boxes */}
        <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-extrabold rounded-2xl border transition-all duration-200 focus:outline-none ${
                digit
                  ? 'border-[#18A6A1] bg-[#EAFafa]/40 text-[#17385E] shadow-sm'
                  : 'border-slate-200 bg-white text-[#17385E] focus:border-[#18A6A1] focus:ring-2 focus:ring-[#18A6A1]/30'
              }`}
            />
          ))}
        </div>

        {/* Primary CTA */}
        <button
          type="submit"
          disabled={loading || otp.join('').length !== 6}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-base font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#18A6A1]/20 hover:shadow-teal-glow transition-all duration-200 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Verifying OTP...</span>
            </>
          ) : (
            <>
              <span>Verify OTP</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Resend Section */}
        <div className="pt-2 text-center space-y-1">
          <p className="text-xs text-slate-500">
            Didn't receive the OTP?
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={countdown > 0 || resending}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#18A6A1] hover:text-[#148F8B] disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>
              {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
            </span>
          </button>
        </div>

      </form>

    </div>
  );
}
