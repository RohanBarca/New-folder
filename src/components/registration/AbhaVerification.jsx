import React, { useState } from 'react';
import { ShieldCheck, Hash, AtSign, ArrowRight, AlertCircle, Info, Loader2 } from 'lucide-react';
import abhaService from '../../services/abhaService';

export default function AbhaVerification({ onOtpSent }) {
  const [authType, setAuthType] = useState('number'); // 'number' | 'address'
  const [abhaNumber, setAbhaNumber] = useState('');
  const [abhaAddress, setAbhaAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle format for 14 digit ABHA Number (XX-XXXX-XXXX-XXXX)
  const handleNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 14);
    let formatted = '';
    for (let i = 0; i < raw.length; i++) {
      if (i === 2 || i === 6 || i === 10) {
        formatted += '-';
      }
      formatted += raw[i];
    }
    setAbhaNumber(formatted);
    if (error) setError('');
  };

  const handleAddressChange = (e) => {
    setAbhaAddress(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const identifier = authType === 'number' ? abhaNumber.replace(/\D/g, '') : abhaAddress.trim();

    if (authType === 'number' && identifier.length !== 14) {
      setError('Please enter a valid 14-digit ABHA number.');
      return;
    }

    if (authType === 'address' && (!identifier || identifier.length < 3)) {
      setError('Please enter a valid ABHA address (e.g. name@abdm).');
      return;
    }

    setLoading(true);
    try {
      const response = await abhaService.sendOtp(identifier, authType);
      if (response.success) {
        onOtpSent({
          identifier: authType === 'number' ? abhaNumber : abhaAddress,
          type: authType,
          txnId: response.txnId
        });
      } else {
        setError(response.message || 'Failed to dispatch OTP. Please check your details.');
      }
    } catch (err) {
      setError('An error occurred during ABHA verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick helper to fill test data for effortless testing
  const handleFillDemoData = () => {
    if (authType === 'number') {
      setAbhaNumber('91-4589-2314-8890');
    } else {
      setAbhaAddress('rahul.shukla@abdm');
    }
    setError('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-xs font-bold text-amber-800">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          <span>Continue with ABHA (Demo)</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17385E] tracking-tight">
          ABHA Account Verification
        </h1>

        <p className="text-sm sm:text-base text-slate-600 font-normal">
          Simulate ABHA identity verification for demonstration purposes.
        </p>
      </div>

      {/* Option Selector Toggle */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => { setAuthType('number'); setError(''); }}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
            authType === 'number'
              ? 'bg-white text-[#17385E] shadow-sm border border-slate-200/80'
              : 'text-slate-500 hover:text-[#17385E]'
          }`}
        >
          <Hash className="w-4 h-4 text-[#18A6A1]" />
          <span>ABHA Number</span>
        </button>

        <button
          type="button"
          onClick={() => { setAuthType('address'); setError(''); }}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
            authType === 'address'
              ? 'bg-white text-[#17385E] shadow-sm border border-slate-200/80'
              : 'text-slate-500 hover:text-[#17385E]'
          }`}
        >
          <AtSign className="w-4 h-4 text-[#18A6A1]" />
          <span>ABHA Address</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {authType === 'number' ? (
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label htmlFor="abha-number" className="text-xs font-bold text-[#17385E]">
                ABHA Number
              </label>
              <button
                type="button"
                onClick={handleFillDemoData}
                className="text-[11px] font-semibold text-[#18A6A1] hover:underline"
              >
                Use Demo Number
              </button>
            </div>
            <div className="relative">
              <input
                id="abha-number"
                type="text"
                value={abhaNumber}
                onChange={handleNumberChange}
                placeholder="Enter your 14-digit ABHA number"
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-[#17385E] text-sm sm:text-base font-semibold placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#18A6A1]/40 focus:border-[#18A6A1] transition-all tracking-wider"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                {abhaNumber.replace(/\D/g, '').length}/14
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Format: 14 digits (e.g. 91-4589-2314-8890)
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label htmlFor="abha-address" className="text-xs font-bold text-[#17385E]">
                ABHA Address
              </label>
              <button
                type="button"
                onClick={handleFillDemoData}
                className="text-[11px] font-semibold text-[#18A6A1] hover:underline"
              >
                Use Demo Address
              </button>
            </div>
            <div className="relative">
              <input
                id="abha-address"
                type="text"
                value={abhaAddress}
                onChange={handleAddressChange}
                placeholder="example@abdm"
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-[#17385E] text-sm sm:text-base font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#18A6A1]/40 focus:border-[#18A6A1] transition-all"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Your self-selected health handle (e.g. name@abdm)
            </p>
          </div>
        )}

        {/* Primary CTA */}
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-base font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B] disabled:opacity-70 shadow-md shadow-[#18A6A1]/20 hover:shadow-teal-glow transition-all duration-200 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Sending OTP...</span>
            </>
          ) : (
            <>
              <span>Send OTP</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Prototype Notice Callout */}
      <div className="p-3.5 rounded-2xl bg-[#EAFafa]/70 border border-[#18A6A1]/25 flex items-start gap-2.5 text-left">
        <Info className="w-4 h-4 text-[#18A6A1] shrink-0 mt-0.5" />
        <p className="text-xs text-[#17385E]/80 leading-relaxed">
          <strong>Prototype Note:</strong> For this prototype, OTP verification is simulated. Click <em>Send OTP</em> and use test OTP <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-[#18A6A1]">123456</code>.
        </p>
      </div>

    </div>
  );
}
