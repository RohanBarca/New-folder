import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  User,
  LogOut,
  MessageSquareHeart,
  Upload,
  FileText,
  Sparkles,
  Leaf,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Bell,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Eye,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Phone,
  Globe,
  BadgeCheck,
  History,
  ClipboardList,
  FileScan,
  HeartPulse,
  Info,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import patientService from '../services/patientService';
import authService from '../services/authService';

// ─── Color palette tokens (reuse existing MedSync design language) ────────────
const TEAL = '#18A6A1';
const NAVY = '#17385E';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function calcAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function shortId(id) {
  if (!id) return '—';
  return id.slice(0, 8).toUpperCase();
}

// ─── Mini Components ──────────────────────────────────────────────────────────

function SectionCard({ id, title, icon: Icon, iconColor, children, className = '' }) {
  return (
    <section
      id={id}
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${iconColor}18` }}
        >
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <h2 className="text-sm font-bold text-[#17385E]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-2 py-6 text-slate-400 justify-center text-sm">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

function EmptyState({ icon: Icon = FileText, message }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
      <Icon className="w-7 h-7" />
      <p className="text-sm text-center">{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <XCircle className="w-6 h-6 text-red-400" />
      <p className="text-sm text-red-500 text-center">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-bold text-[#18A6A1] hover:underline flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>
  );
}

function Badge({ label, color = TEAL }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ background: `${color}18`, color }}
    >
      {label}
    </span>
  );
}

// ─── Consent Types Metadata ────────────────────────────────────────────────────
const CONSENT_TYPES = [
  { key: 'medical_history',      label: 'Medical History',      icon: ClipboardList,  purpose: 'Allow MedSync to store and process your medical history.' },
  { key: 'document_processing',  label: 'Document Processing',  icon: FileScan,       purpose: 'Allow OCR and text extraction from your uploaded records.' },
  { key: 'ai_processing',        label: 'AI Processing',        icon: Sparkles,       purpose: 'Allow Groq AI to analyze your information and generate summaries.' },
  { key: 'doctor_access',        label: 'Doctor Access',        icon: User,           purpose: 'Allow authorized doctors to view your health profile.' },
  { key: 'voice_processing',     label: 'Voice Processing',     icon: HeartPulse,     purpose: 'Allow voice-based AI health interview capabilities.' },
  { key: 'abdm_sharing',         label: 'ABDM Sharing',         icon: Globe,          purpose: 'Allow record exchange via Ayushman Bharat Digital Mission gateway.' },
];

// ─── Sidebar Nav Items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'welcome',   label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'profile',   label: 'My Profile',      icon: User },
  { id: 'records',   label: 'Medical Records', icon: FileText },
  { id: 'interview', label: 'Health History',  icon: MessageSquareHeart },
  { id: 'summary',   label: 'AI Summary',      icon: Sparkles },
  { id: 'ayush',     label: 'AYUSH History',   icon: Leaf },
  { id: 'consent',   label: 'Privacy & Consent', icon: Shield },
  { id: 'activity',  label: 'Recent Activity', icon: Clock },
];

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function PatientDashboard() {
  const navigate = useNavigate();

  // SECURITY: patient identity from sessionStorage only — never from URL params
  const [patientId] = useState(() => sessionStorage.getItem('medsync_patient_id') || '');
  const [patientName] = useState(() => sessionStorage.getItem('medsync_patient_name') || '');

  // Dashboard data state
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [ayushHistory, setAyushHistory] = useState(null);
  const [summary, setSummary] = useState(null);
  const [consents, setConsents] = useState([]);

  // UI state
  const [errors, setErrors] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('welcome');
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [docOcr, setDocOcr] = useState({});
  const [consentLoading, setConsentLoading] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showFullSummary, setShowFullSummary] = useState(false);

  // ── Redirect if no session ───────────────────────────────────────────────
  useEffect(() => {
    if (!patientId) {
      navigate('/patient/login', { replace: true });
    }
  }, [patientId, navigate]);

  // ── Load all dashboard data in parallel ────────────────────────────────
  const loadDashboard = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);

    const currentUser = await authService.getCurrentUser();
    if (!currentUser.authenticated || currentUser.patient_id !== patientId) {
      await authService.logout();
      navigate('/patient/login', { replace: true });
      return;
    }

    const result = await patientService.loadDashboard(patientId);

    setProfile(result.profile.success ? result.profile.patient : null);
    setDocuments(result.documents.success ? result.documents.documents : []);
    setSessions(result.sessions.success ? result.sessions.sessions : []);
    setAyushHistory(result.ayush.success ? result.ayush.ayush_history : null);
    setSummary(result.summary.success ? result.summary : null);
    setConsents(result.consents.success ? result.consents.consents : []);

    const errs = {};
    if (!result.profile.success) errs.profile = result.profile.error;
    if (!result.documents.success) errs.documents = result.documents.error;
    if (!result.sessions.success) errs.sessions = result.sessions.error;
    if (!result.ayush.success) errs.ayush = result.ayush.error;
    if (!result.consents.success) errs.consents = result.consents.error;
    setErrors(errs);

    // Build smart notifications
    const notifs = [];
    if (result.sessions.success && result.sessions.sessions.length === 0) {
      notifs.push({ type: 'info', text: 'Start your AI Health Interview to begin building your clinical history.' });
    }
    if (result.documents.success && result.documents.documents.length === 0) {
      notifs.push({ type: 'info', text: 'Upload your medical records to enable AI-powered document analysis.' });
    }
    if (!result.summary.success && result.sessions.success && result.sessions.sessions.length > 0) {
      notifs.push({ type: 'tip', text: 'Your AI Health Summary is ready to be generated from your interview history.' });
    }
    if (result.summary.success) {
      notifs.push({ type: 'success', text: 'Your AI Health Summary has been generated and is ready for physician review.' });
    }
    setNotifications(notifs);

    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    sessionStorage.removeItem('medsync_patient_id');
    sessionStorage.removeItem('medsync_patient_name');
    sessionStorage.removeItem('medsync_patient_language');
    sessionStorage.removeItem('medsync_chat_session_id');
    navigate('/patient/entry');
  };

  // ── Load OCR for a document on demand ─────────────────────────────────────
  const loadDocOcr = async (docId) => {
    if (docOcr[docId] !== undefined) return;
    setDocOcr((prev) => ({ ...prev, [docId]: 'loading' }));
    const result = await patientService.getDocumentOcr(docId);
    setDocOcr((prev) => ({ ...prev, [docId]: result }));
  };

  const toggleDocExpand = (docId) => {
    if (expandedDoc === docId) {
      setExpandedDoc(null);
    } else {
      setExpandedDoc(docId);
      loadDocOcr(docId);
    }
  };

  // ── Consent management ─────────────────────────────────────────────────────
  const getConsentForType = (key) =>
    consents.filter((c) => c.consent_type === key).sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    )[0] || null;

  const handleGrantConsent = async (key, purpose) => {
    setConsentLoading(key);
    const result = await patientService.grantConsent(patientId, key, purpose);
    if (result.success && result.consent) {
      setConsents((prev) => [...prev, result.consent]);
    }
    setConsentLoading(null);
  };

  const handleRevokeConsent = async (key) => {
    const existing = getConsentForType(key);
    if (!existing || existing.status !== 'granted') return;
    setConsentLoading(key);
    const result = await patientService.revokeConsent(patientId, existing.id);
    if (result.success && result.consent) {
      setConsents((prev) => prev.map((c) => (c.id === result.consent.id ? result.consent : c)));
    }
    setConsentLoading(null);
  };

  // ── Consultation status derived from chat sessions ────────────────────────
  const getConsultationStatus = () => {
    if (!sessions || sessions.length === 0) return { label: 'Not Started', color: '#94a3b8', icon: Clock };
    const completed = sessions.filter((s) => s.status === 'completed' || s.is_complete);
    if (summary) return { label: 'Ready for Doctor', color: TEAL, icon: CheckCircle2 };
    if (completed.length > 0) return { label: 'History Completed', color: '#22c55e', icon: CheckCircle2 };
    return { label: 'History In Progress', color: '#f59e0b', icon: History };
  };

  // ── Profile completion ─────────────────────────────────────────────────────
  const getProfileCompletion = () => {
    if (!profile) return 0;
    const fields = [profile.name, profile.date_of_birth, profile.gender, profile.phone, profile.language];
    const filled = fields.filter(Boolean).length;
    const docBonus = documents.length > 0 ? 1 : 0;
    const chatBonus = sessions.length > 0 ? 1 : 0;
    return Math.round(((filled + docBonus + chatBonus) / (fields.length + 2)) * 100);
  };

  // ── Red flags from sessions ───────────────────────────────────────────────
  const hasRedFlag = sessions.some((s) => s.has_red_flag || s.red_flag);

  // ── Recent activity timeline from available data ──────────────────────────
  const buildActivity = () => {
    const items = [];
    if (profile?.created_at)
      items.push({ date: profile.created_at, label: 'Patient registered', icon: User, color: TEAL });
    documents.forEach((d) => {
      if (d.created_at || d.upload_date)
        items.push({ date: d.created_at || d.upload_date, label: `Medical record uploaded: ${d.file_name || d.document_type || 'Document'}`, icon: Upload, color: '#6366f1' });
      if ((d.ocr_status === 'success' || d.ocr_status === 'completed') && (d.created_at || d.upload_date))
        items.push({ date: d.created_at || d.upload_date, label: 'OCR text extraction completed', icon: FileScan, color: '#8b5cf6' });
    });
    sessions.forEach((s) => {
      if (s.created_at)
        items.push({ date: s.created_at, label: `AI ${s.mode === 'ayush' ? 'AYUSH' : 'Health'} interview session started`, icon: MessageSquareHeart, color: '#0ea5e9' });
      if ((s.status === 'completed' || s.is_complete) && s.updated_at)
        items.push({ date: s.updated_at, label: `AI ${s.mode === 'ayush' ? 'AYUSH' : 'Health'} interview completed`, icon: CheckCircle2, color: '#22c55e' });
    });
    if (summary?.summary_record?.created_at)
      items.push({ date: summary.summary_record.created_at, label: 'AI Health Summary generated', icon: Sparkles, color: '#f59e0b' });
    consents.filter((c) => c.created_at).forEach((c) => {
      items.push({ date: c.created_at, label: `Consent ${c.status}: ${c.consent_type?.replace(/_/g, ' ')}`, icon: Shield, color: c.status === 'granted' ? '#22c55e' : '#ef4444' });
    });
    return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 12);
  };

  // ── Scroll to section ──────────────────────────────────────────────────────
  const scrollToSection = (id) => {
    setActiveSection(id);
    setSidebarOpen(false);
    const el = document.getElementById(`dash-section-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  const status = getConsultationStatus();
  const completion = getProfileCompletion();
  const activity = buildActivity();
  const summaryJson = summary?.summary_record?.summary_json || summary?.summary_json || null;

  return (
    <div className="min-h-screen bg-[#F8FBFC] text-[#17385E] flex flex-col">

      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Left: Hamburger (mobile) + Logo */}
          <div className="flex items-center gap-3">
            <button
              id="dashboard-sidebar-toggle"
              onClick={() => setSidebarOpen((o) => !o)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Toggle navigation"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>

            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] flex items-center justify-center shadow-md shadow-[#18A6A1]/20 group-hover:scale-105 transition-transform">
                <Activity className="w-4 h-4 text-white stroke-[2.5]" />
              </div>
              <span className="text-base font-extrabold tracking-tight text-[#17385E]">
                Med<span className="text-[#18A6A1]">Sync</span>
              </span>
            </Link>
          </div>

          {/* Center: Patient badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EAFafa] border border-[#18A6A1]/20 text-xs font-semibold text-[#17385E]">
            <BadgeCheck className="w-3.5 h-3.5 text-[#18A6A1]" />
            <span>Patient Portal</span>
            {patientId && (
              <span className="text-slate-400 font-mono">· ID: {shortId(patientId)}</span>
            )}
          </div>

          {/* Right: Notifications + Avatar + Logout */}
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <div className="relative">
                <Bell className="w-5 h-5 text-slate-400" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#18A6A1] border-2 border-white" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] flex items-center justify-center text-white text-xs font-extrabold shadow-sm">
                {(patientName || profile?.name || 'P')[0].toUpperCase()}
              </div>
              <span className="hidden md:block text-sm font-semibold text-[#17385E] max-w-[140px] truncate">
                {patientName || profile?.name || 'Patient'}
              </span>
            </div>

            <button
              id="dashboard-logout-btn"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-screen-xl mx-auto w-full">

        {/* ── Sidebar (desktop always visible, mobile overlay) ──────────────── */}
        <>
          {/* Mobile overlay backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <aside
            className={`
              fixed lg:sticky top-0 lg:top-16 z-30 h-screen lg:h-[calc(100vh-4rem)]
              w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0
              transition-transform duration-300 lg:translate-x-0
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
          >
            {/* Mobile close */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 lg:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Navigation</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
                    ${activeSection === id
                      ? 'bg-[#EAFafa] text-[#18A6A1]'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-[#17385E]'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${activeSection === id ? 'text-[#18A6A1]' : 'text-slate-400'}`} />
                  {label}
                </button>
              ))}
            </nav>

            {/* Bottom Quick Actions */}
            <div className="p-4 border-t border-slate-100 space-y-2">
              <Link
                to="/patient/chat"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B] transition-colors shadow-md shadow-[#18A6A1]/20"
              >
                <MessageSquareHeart className="w-4 h-4" />
                Start Interview
              </Link>
              <Link
                to="/patient/records"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-[#17385E] bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Record
              </Link>
            </div>
          </aside>
        </>

        {/* ── Main Content ──────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 min-w-0">

          {/* ── Loading overlay ─────────────────────────────────────────── */}
          {loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
                <p className="text-sm font-semibold text-[#17385E]">Loading your dashboard…</p>
              </div>
            </div>
          )}

          {/* ── 1. Welcome Hero ──────────────────────────────────────────── */}
          <section id="dash-section-welcome">
            <div className="bg-gradient-to-br from-[#17385E] to-[#1a4a72] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
              {/* Decorative blobs */}
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-[#18A6A1]/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-[#25C4BE]/10 rounded-full blur-xl pointer-events-none" />

              <div className="relative">
                <p className="text-sm font-semibold text-[#25C4BE] mb-1">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                  {getGreeting()}, {(patientName || profile?.name || 'Patient').split(' ')[0]} 👋
                </h1>
                <p className="text-sm sm:text-base text-white/70 mb-6 max-w-lg">
                  Your health information, history and consultation preparation — all in one place.
                </p>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Profile Complete', value: `${completion}%`, color: '#25C4BE' },
                    { label: 'Documents', value: documents.length, color: '#60a5fa' },
                    { label: 'Interviews', value: sessions.length, color: '#a78bfa' },
                    { label: 'Status', value: status.label, color: status.color },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white/10 rounded-xl p-3">
                      <p className="text-xs text-white/60 font-medium mb-1">{label}</p>
                      <p className="text-base font-extrabold" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/patient/chat"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-[#18A6A1] hover:bg-[#14908c] transition-all shadow-lg shadow-[#18A6A1]/30"
                  >
                    <MessageSquareHeart className="w-4 h-4" />
                    AI Health Interview
                  </Link>
                  <Link
                    to="/patient/records"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-[#17385E] bg-white hover:bg-slate-50 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Record
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ── Red Flag Notice (non-diagnostic) ─────────────────────────── */}
          {hasRedFlag && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 mb-0.5">Important Notice</p>
                <p className="text-xs text-amber-700">
                  Your health interview contains information that may require prompt medical attention.
                  Please discuss this with a qualified healthcare professional at the earliest.
                </p>
              </div>
            </div>
          )}

          {/* ── Notifications ─────────────────────────────────────────────── */}
          {notifications.length > 0 && (
            <div className="space-y-2">
              {notifications.map((n, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
                    n.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : n.type === 'tip'
                      ? 'bg-[#EAFafa] border-[#18A6A1]/30 text-[#17385E]'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}
                >
                  {n.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
                  {n.text}
                </div>
              ))}
            </div>
          )}

          {/* ── Quick Action Cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'AI Interview',   desc: 'Start health intake', icon: MessageSquareHeart, to: '/patient/chat',    color: TEAL },
              { label: 'Upload Record',  desc: 'Add medical docs',    icon: Upload,             to: '/patient/records', color: '#6366f1' },
              { label: 'AI Summary',     desc: 'View health report',  icon: Sparkles,           action: () => scrollToSection('summary'), color: '#f59e0b' },
              { label: 'AYUSH History',  desc: 'Ayurvedic intake',    icon: Leaf,               action: () => scrollToSection('ayush'),   color: '#22c55e' },
              { label: 'My Records',     desc: 'Uploaded documents',  icon: FileText,           action: () => scrollToSection('records'), color: '#0ea5e9' },
            ].map(({ label, desc, icon: Icon, to, action, color }) => (
              to ? (
                <Link
                  key={label}
                  to={to}
                  className="group bg-white rounded-2xl p-4 border border-slate-200 hover:border-current hover:shadow-md transition-all flex flex-col items-start gap-3"
                  style={{ '--tw-border-opacity': 1 }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#17385E]">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                </Link>
              ) : (
                <button
                  key={label}
                  onClick={action}
                  className="group bg-white rounded-2xl p-4 border border-slate-200 hover:border-current hover:shadow-md transition-all flex flex-col items-start gap-3 text-left"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#17385E]">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                </button>
              )
            ))}
          </div>

          {/* ── 2. Health Profile ─────────────────────────────────────────── */}
          <SectionCard id="dash-section-profile" title="My Health Profile" icon={User} iconColor={TEAL}>
            {loading ? <LoadingState label="Loading profile…" /> :
             errors.profile ? <ErrorState message={errors.profile} onRetry={loadDashboard} /> :
             !profile ? <EmptyState icon={User} message="Profile not available." /> : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {[
                    { icon: User,     label: 'Full Name',   value: profile.name },
                    { icon: Calendar, label: 'Date of Birth', value: profile.date_of_birth ? `${formatDate(profile.date_of_birth)}${calcAge(profile.date_of_birth) ? ` (${calcAge(profile.date_of_birth)} yrs)` : ''}` : '—' },
                    { icon: User,     label: 'Gender',      value: profile.gender || '—' },
                    { icon: Phone,    label: 'Phone',        value: profile.phone || '—' },
                    { icon: Globe,    label: 'Language',     value: profile.language === 'hi' ? 'Hindi / हिन्दी' : profile.language === 'en' ? 'English' : profile.language || '—' },
                    { icon: BadgeCheck, label: 'ABHA Address', value: profile.abha_address || profile.abha_id || 'Not linked' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400 font-medium">{label}</p>
                        <p className="text-sm font-bold text-[#17385E] truncate">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Profile completion bar */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500">Profile Completion</span>
                    <span className="text-xs font-extrabold" style={{ color: TEAL }}>{completion}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${completion}%`, background: `linear-gradient(90deg, ${TEAL}, #25C4BE)` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <div className="text-xs text-slate-400 font-mono bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
                    Patient ID: <span className="font-bold text-[#17385E]">{shortId(patientId)}</span>
                    <span className="text-slate-300"> ···</span>
                  </div>
                </div>
              </>
            )}
          </SectionCard>

          {/* ── 3. Consultation Status ────────────────────────────────────── */}
          <SectionCard id="dash-section-status" title="Consultation Status" icon={HeartPulse} iconColor="#6366f1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${status.color}18` }}>
                <status.icon className="w-6 h-6" style={{ color: status.color }} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Current Status</p>
                <p className="text-lg font-extrabold" style={{ color: status.color }}>{status.label}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-1">
              {['Not Started', 'In Progress', 'Completed', 'Ready for Doctor'].map((s, i) => {
                const active = (
                  (status.label === 'Not Started' && i === 0) ||
                  (status.label === 'History In Progress' && i <= 1) ||
                  (status.label === 'History Completed' && i <= 2) ||
                  (status.label === 'Ready for Doctor' && i <= 3)
                );
                return (
                  <div key={s}>
                    <div className={`h-1.5 rounded-full mb-1.5 transition-all ${active ? '' : 'bg-slate-100'}`}
                         style={active ? { background: TEAL } : {}} />
                    <p className={`text-[10px] font-semibold ${active ? 'text-[#18A6A1]' : 'text-slate-300'}`}>{s}</p>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* ── 4. Medical Records ────────────────────────────────────────── */}
          <SectionCard id="dash-section-records" title="My Medical Records" icon={FileText} iconColor="#6366f1">
            {loading ? <LoadingState label="Loading records…" /> :
             errors.documents ? <ErrorState message={errors.documents} onRetry={loadDashboard} /> :
             documents.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <FileText className="w-8 h-8 text-slate-300" />
                <p className="text-sm text-slate-400">No medical records uploaded yet.</p>
                <Link
                  to="/patient/records"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B] transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Your First Record
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const docId = doc.document_id || doc.id;
                  const isExpanded = expandedDoc === docId;
                  const ocrResult = docOcr[docId];

                  return (
                    <div key={docId} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => toggleDocExpand(docId)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#6366f1]/10 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-[#6366f1]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#17385E] truncate">
                              {doc.file_name || doc.document_type || 'Medical Document'}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-slate-400">
                                {formatDate(doc.created_at || doc.upload_date)}
                              </span>
                              {doc.document_type && (
                                <Badge label={doc.document_type} color="#6366f1" />
                              )}
                              <Badge
                                label={doc.ocr_status === 'success' || doc.ocr_status === 'completed' ? 'OCR ✓' : doc.ocr_status || 'Pending'}
                                color={doc.ocr_status === 'success' || doc.ocr_status === 'completed' ? '#22c55e' : '#f59e0b'}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-slate-400">Document ID:</span> <span className="font-mono text-[#17385E]">{shortId(docId)}</span></div>
                            <div><span className="text-slate-400">OCR Status:</span> <span className="font-bold text-[#17385E]">{doc.ocr_status || 'Unknown'}</span></div>
                          </div>

                          {/* OCR Text */}
                          {ocrResult === 'loading' ? (
                            <LoadingState label="Loading OCR text…" />
                          ) : ocrResult?.success && ocrResult?.extracted_text ? (
                            <div>
                              <p className="text-xs font-bold text-slate-500 mb-1.5">Extracted Text (OCR)</p>
                              <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-600 font-mono max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                {ocrResult.extracted_text}
                              </div>
                            </div>
                          ) : ocrResult && !ocrResult.success ? (
                            <p className="text-xs text-slate-400">OCR text not available.</p>
                          ) : null}

                          <Link
                            to="/patient/records"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#18A6A1] hover:underline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Open in Record Viewer
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}

                <Link
                  to="/patient/records"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-300 text-sm font-bold text-slate-400 hover:border-[#18A6A1] hover:text-[#18A6A1] transition-colors mt-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Another Record
                </Link>
              </div>
            )}
          </SectionCard>

          {/* ── 5. AI Health Interview ────────────────────────────────────── */}
          <SectionCard id="dash-section-interview" title="AI Health Interview" icon={MessageSquareHeart} iconColor="#0ea5e9">
            {loading ? <LoadingState label="Loading sessions…" /> :
             errors.sessions ? <ErrorState message={errors.sessions} onRetry={loadDashboard} /> :
             sessions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <MessageSquareHeart className="w-8 h-8 text-slate-300" />
                <p className="text-sm text-slate-400">No AI health interview completed yet.</p>
                <Link
                  to="/patient/chat"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B] transition-colors"
                >
                  <MessageSquareHeart className="w-3.5 h-3.5" />
                  Start Your Interview
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Sessions', value: sessions.length, color: '#0ea5e9' },
                    { label: 'Completed', value: sessions.filter(s => s.status === 'completed' || s.is_complete).length, color: '#22c55e' },
                    { label: 'Last Session', value: sessions[0]?.created_at ? formatDate(sessions[0].created_at) : '—', color: NAVY },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-extrabold" style={{ color }}>{value}</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Sessions list */}
                <div className="space-y-2">
                  {sessions.slice(0, 5).map((s, i) => {
                    const sid = s.session_id || s.id;
                    const isComplete = s.status === 'completed' || s.is_complete;
                    return (
                      <div key={sid || i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isComplete ? 'bg-green-500' : 'bg-amber-400'}`} />
                          <div>
                            <p className="text-xs font-bold text-[#17385E]">
                              {s.mode === 'ayush' ? 'AYUSH Assessment' : 'General Health Interview'}
                            </p>
                            <p className="text-xs text-slate-400">{formatDateTime(s.created_at)}</p>
                          </div>
                        </div>
                        <Badge label={isComplete ? 'Completed' : 'In Progress'} color={isComplete ? '#22c55e' : '#f59e0b'} />
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link
                    to="/patient/chat"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B] transition-colors"
                  >
                    <MessageSquareHeart className="w-3.5 h-3.5" />
                    {sessions.some(s => !(s.status === 'completed' || s.is_complete)) ? 'Continue Interview' : 'Start New Interview'}
                  </Link>
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── 6. AYUSH Section ──────────────────────────────────────────── */}
          <SectionCard id="dash-section-ayush" title="AYUSH / Ayurvedic Assessment" icon={Leaf} iconColor="#22c55e">
            {loading ? <LoadingState label="Loading AYUSH history…" /> :
             !ayushHistory || Object.keys(ayushHistory).length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Leaf className="w-8 h-8 text-slate-300" />
                <p className="text-sm text-slate-400">No AYUSH / Dashavidha Pariksha history available.</p>
                <Link
                  to="/patient/chat"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white bg-[#22c55e] hover:bg-[#16a34a] transition-colors"
                >
                  <Leaf className="w-3.5 h-3.5" />
                  Start AYUSH Assessment
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-bold text-[#17385E]">Dashavidha Pariksha History Collected</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  The following patient-reported information has been captured during the AYUSH assessment.
                  This is patient-provided information only, not a practitioner's diagnosis.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(ayushHistory).slice(0, 10).map(([key, val]) => (
                    <div key={key} className="bg-green-50 border border-green-100 rounded-xl p-3">
                      <p className="text-xs font-bold text-green-700 mb-1 capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-600">{String(val).slice(0, 120)}</p>
                    </div>
                  ))}
                </div>
                <Link
                  to="/patient/chat"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#22c55e] hover:underline mt-2"
                >
                  <History className="w-3.5 h-3.5" />
                  Continue AYUSH Assessment
                </Link>
              </div>
            )}
          </SectionCard>

          {/* ── 7. AI Health Summary ──────────────────────────────────────── */}
          <SectionCard id="dash-section-summary" title="My AI Health Summary" icon={Sparkles} iconColor="#f59e0b">
            {loading ? <LoadingState label="Loading summary…" /> :
             !summary ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Sparkles className="w-8 h-8 text-slate-300" />
                <p className="text-sm text-slate-400">No AI health summary generated yet.</p>
                <p className="text-xs text-slate-400 text-center max-w-sm">
                  Complete your health interview and upload records, then generate your summary from the Medical Records page.
                </p>
                <Link
                  to="/patient/records"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white bg-[#f59e0b] hover:bg-[#d97706] transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Go to Records & Summary
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Generated timestamp */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-bold text-[#17385E]">Summary Generated</span>
                  </div>
                  <Badge label={formatDate(summary.summary_record?.created_at)} color="#f59e0b" />
                </div>

                {/* Summary preview */}
                {summaryJson && (
                  <div className="space-y-3">
                    {summaryJson.chief_complaint && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <p className="text-xs font-bold text-amber-700 mb-1">Chief Complaint</p>
                        <p className="text-xs text-slate-600">{summaryJson.chief_complaint}</p>
                      </div>
                    )}
                    {summaryJson.hpi && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <p className="text-xs font-bold text-amber-700 mb-1">History of Present Illness</p>
                        <p className="text-xs text-slate-600 line-clamp-3">{summaryJson.hpi}</p>
                      </div>
                    )}
                    {!showFullSummary && summaryJson.important_findings && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <p className="text-xs font-bold text-amber-700 mb-1">Important Findings</p>
                        <p className="text-xs text-slate-600">{summaryJson.important_findings}</p>
                      </div>
                    )}

                    {showFullSummary && (
                      <div className="space-y-2">
                        {Object.entries(summaryJson).filter(([k]) => !['chief_complaint', 'hpi'].includes(k)).map(([k, v]) => (
                          typeof v === 'string' && v.trim() ? (
                            <div key={k} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                              <p className="text-xs font-bold text-amber-700 mb-1 capitalize">{k.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-slate-600 whitespace-pre-wrap">{v}</p>
                            </div>
                          ) : null
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => setShowFullSummary((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#18A6A1] hover:underline"
                    >
                      {showFullSummary ? <><ChevronUp className="w-3.5 h-3.5" /> Show Less</> : <><ChevronDown className="w-3.5 h-3.5" /> View Full Summary</>}
                    </button>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500">
                    AI-generated information. Physician verification required before clinical use.
                  </p>
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── 8. Privacy & Consent ──────────────────────────────────────── */}
          <SectionCard id="dash-section-consent" title="Privacy & Consent" icon={Shield} iconColor="#8b5cf6">
            {loading ? <LoadingState label="Loading consents…" /> :
             errors.consents ? <ErrorState message={errors.consents} onRetry={loadDashboard} /> : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 mb-4">
                  Manage your data sharing preferences. Revoking consent may affect related features.
                  These controls are for your information — they do not constitute a legally binding agreement.
                </p>
                {CONSENT_TYPES.map(({ key, label, icon: Icon, purpose }) => {
                  const record = getConsentForType(key);
                  const isGranted = record?.status === 'granted';
                  const isBusy = consentLoading === key;

                  return (
                    <div key={key} className="flex items-start justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isGranted ? 'bg-green-50' : 'bg-slate-100'}`}>
                          <Icon className={`w-4 h-4 ${isGranted ? 'text-green-500' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#17385E]">{label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{purpose}</p>
                          {record && (
                            <p className="text-xs text-slate-300 mt-1">
                              Last updated: {formatDateTime(record.updated_at || record.created_at)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className={`text-xs font-bold ${isGranted ? 'text-green-600' : 'text-slate-400'}`}>
                          {isGranted ? 'Granted' : record?.status === 'revoked' ? 'Revoked' : 'Not Set'}
                        </span>
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : isGranted ? (
                          <button
                            onClick={() => handleRevokeConsent(key)}
                            title="Revoke consent"
                            className="p-1 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                          >
                            <ToggleRight className="w-5 h-5 text-green-500" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGrantConsent(key, purpose)}
                            title="Grant consent"
                            className="p-1 rounded-lg text-slate-400 hover:bg-green-50 transition-colors"
                          >
                            <ToggleLeft className="w-5 h-5 text-slate-300" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* ── 9. Recent Activity ────────────────────────────────────────── */}
          <SectionCard id="dash-section-activity" title="Recent Activity" icon={Clock} iconColor="#0ea5e9">
            {loading ? <LoadingState label="Building timeline…" /> :
             activity.length === 0 ? (
              <EmptyState icon={Clock} message="No recent activity to display." />
            ) : (
              <div className="relative">
                <div className="absolute left-[18px] top-0 bottom-0 w-px bg-slate-100" />
                <div className="space-y-4">
                  {activity.map(({ date, label, icon: Icon, color }, i) => (
                    <div key={i} className="flex items-start gap-4 relative">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white"
                        style={{ background: `${color}18` }}
                      >
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="pt-1 min-w-0">
                        <p className="text-sm font-semibold text-[#17385E]">{label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <footer className="text-center text-xs text-slate-400 border-t border-slate-200 pt-6 pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] flex items-center justify-center">
                <Activity className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-[#17385E]">MedSync</span>
            </div>
            <p>© 2026 MedSync. AI-generated health information requires physician verification.</p>
            <p className="mt-1">This platform does not provide medical diagnosis, treatment advice, or legal health compliance.</p>
          </footer>

        </main>
      </div>
    </div>
  );
}
