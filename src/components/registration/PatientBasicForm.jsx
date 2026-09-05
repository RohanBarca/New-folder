import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  FileText,
  HeartHandshake,
  Loader2,
  AlertCircle
} from 'lucide-react';

import { API_BASE } from '../../services/api';

function formatMaskedPhone(value) {
  if (!value) return '—';
  const cleaned = String(value).replace(/\s+/g, '');
  if (cleaned.startsWith('+91')) return cleaned;
  return `+91 ${cleaned}`;
}

export default function PatientBasicForm({ abhaData }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: abhaData?.name || '',
    dob: abhaData?.dob || '',
    gender: abhaData?.gender || 'Male',
    mobile: sessionStorage.getItem('medsync_phone_masked') || '',
    email: abhaData?.email || '',
    city: abhaData?.city || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent duplicate submissions
    if (isSubmitting || isSubmitted) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const patientId = sessionStorage.getItem('medsync_patient_id');
      const token = sessionStorage.getItem('medsync_token');
      if (!patientId || !token) throw new Error('Your session has expired. Please verify your mobile number again.');

      const res = await fetch(`${API_BASE}/api/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.fullName.trim(),
          date_of_birth: formData.dob || null,
          gender: formData.gender || null,
          language: 'en',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Surface a safe error message from backend
        const detail = data?.detail || 'Registration failed. Please try again.';
        throw new Error(Array.isArray(detail) ? detail[0]?.msg || detail[0] : detail);
      }

      // Store patient_id in sessionStorage for downstream pages
      // (OCR, Chatbot, AYUSH, Doctor Dashboard)
      sessionStorage.setItem('medsync_patient_id', data.id);
      sessionStorage.setItem('medsync_patient_name', data.name);
      sessionStorage.setItem('medsync_patient_language', data.language);

      setPatientId(data.id);
      setIsSubmitted(true);

    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS STATE
  if (isSubmitted) {
    return (
      <div className="text-center py-6 space-y-6 animate-fadeIn">
        {/* Animated Check Icon */}
        <div className="relative w-20 h-20 rounded-full bg-[#EAFafa] border-2 border-[#18A6A1] flex items-center justify-center text-[#18A6A1] mx-auto shadow-teal-glow">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#18A6A1] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#18A6A1]"></span>
          </span>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-2 max-w-md mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17385E] tracking-tight">
            Your basic profile is ready.
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-normal">
            Next, we'll collect your medical history.
          </p>
        </div>

        {/* Summary Card Preview */}
        <div className="max-w-md mx-auto p-5 rounded-3xl bg-[#F8FBFC] border border-slate-200 text-left space-y-3 shadow-soft-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Profile</span>
            <span className="text-xs font-bold text-[#18A6A1] bg-[#EAFafa] px-2.5 py-0.5 rounded-full">
              Registered ✓
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Name:</span>
              <p className="font-bold text-[#17385E]">{formData.fullName}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Gender:</span>
              <p className="font-bold text-[#17385E]">{formData.gender}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Mobile:</span>
              <p className="font-bold text-[#17385E]">{formatMaskedPhone(formData.mobile)}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">City:</span>
              <p className="font-bold text-[#17385E]">{formData.city}</p>
            </div>
          </div>

          {patientId && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 font-medium text-xs">Patient ID:</span>
              <p className="font-mono text-[10px] text-[#17385E] font-bold break-all">{patientId}</p>
            </div>
          )}
        </div>

        {/* Informational Callout */}
        <div className="max-w-md mx-auto p-4 rounded-2xl bg-[#EAFafa]/70 border border-[#18A6A1]/30 text-xs text-[#17385E] flex items-start gap-3 text-left">
          <Sparkles className="w-5 h-5 text-[#18A6A1] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Your record is saved:</span> Your Patient ID has been registered in the MedSync database. Upload medical documents next to let our AI build your clinical history.
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          <Link
            to="/patient/dashboard"
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-sm font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B] shadow-md shadow-[#18A6A1]/20 transition-all cursor-pointer"
          >
            <span>Go to My Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/patient/records"
            className="w-full inline-flex items-center justify-center py-3.5 px-6 rounded-full text-sm font-semibold text-[#17385E] bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Upload Medical Records
          </Link>
        </div>
      </div>
    );
  }

  // BASIC REGISTRATION FORM
  return (
    <div className="space-y-6">
      
      {/* Form Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAFafa] border border-[#18A6A1]/30 text-xs font-bold text-[#18A6A1]">
          <User className="w-3.5 h-3.5" />
          <span>Step 2 of 2</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17385E] tracking-tight">
          Tell us about yourself
        </h1>

        <p className="text-sm sm:text-base text-slate-600 font-normal">
          Add a few basic details to create your patient profile.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        
        {/* Field 1: Full Name */}
        <div className="space-y-1.5">
          <label htmlFor="fullName" className="text-xs font-bold text-[#17385E]">
            Full Name
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-[#17385E] text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#18A6A1]/40 focus:border-[#18A6A1] transition-all"
            />
          </div>
        </div>

        {/* Row: Date of Birth & Gender */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Field 2: Date of Birth */}
          <div className="space-y-1.5">
            <label htmlFor="dob" className="text-xs font-bold text-[#17385E]">
              Date of Birth
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                id="dob"
                name="dob"
                type="date"
                required
                value={formData.dob}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-[#17385E] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#18A6A1]/40 focus:border-[#18A6A1] transition-all"
              />
            </div>
          </div>

          {/* Field 3: Gender Dropdown */}
          <div className="space-y-1.5">
            <label htmlFor="gender" className="text-xs font-bold text-[#17385E]">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-[#17385E] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#18A6A1]/40 focus:border-[#18A6A1] transition-all"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

        </div>

        {/* Row: Mobile Number & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Field 4: Mobile Number */}
          <div className="space-y-1.5">
            <label htmlFor="mobile" className="text-xs font-bold text-[#17385E]">
              Mobile Number
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                id="mobile"
                name="mobile"
                type="tel"
                required
                value={formData.mobile}
                readOnly
                placeholder="Enter mobile number"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-[#17385E] text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
              />
            </div>
          </div>

          {/* Field 5: Email Address */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-bold text-[#17385E]">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address (optional)"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-[#17385E] text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#18A6A1]/40 focus:border-[#18A6A1] transition-all"
              />
            </div>
          </div>

        </div>

        {/* Field 6: City */}
        <div className="space-y-1.5">
          <label htmlFor="city" className="text-xs font-bold text-[#17385E]">
            City
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <MapPin className="w-4 h-4" />
            </div>
            <input
              id="city"
              name="city"
              type="text"
              required
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter your city"
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-[#17385E] text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#18A6A1]/40 focus:border-[#18A6A1] transition-all"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-base font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B] shadow-md shadow-[#18A6A1]/20 hover:shadow-teal-glow transition-all duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving your profile...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
}


