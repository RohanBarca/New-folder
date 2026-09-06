import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  Calendar, 
  Sparkles, 
  Stethoscope, 
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import ThemeToggle from '../ThemeToggle';

export default function DoctorHeader({ 
  title = "Physician Dashboard", 
  subtitle = "Real-time structured intake and clinical summaries",
  breadcrumbs = [],
  searchValue = "",
  onSearchChange = null,
  showSearch = true
}) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 shadow-2xs">
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        
        {/* Left: Title & Breadcrumbs */}
        <div>
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
              <Link to="/doctor/dashboard" className="hover:text-[#18A6A1] transition-colors">
                Dashboard
              </Link>
              {breadcrumbs.map((b, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  <span className={idx === breadcrumbs.length - 1 ? "text-[#18A6A1] font-bold" : "hover:text-[#18A6A1]"}>
                    {b.label}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-extrabold text-[#17385E] tracking-tight">
              {title}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#EAF5F6] border border-[#B8D9DD] text-[10px] font-bold text-[#137C8B]">
              <Sparkles className="w-3 h-3" />
              <span>AI Assisted</span>
            </span>
          </div>

          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* Right: Search + Date + Action */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle compact />
          
          {/* Quick Search */}
          {showSearch && onSearchChange && (
            <div className="relative w-full md:w-64 order-first md:order-none">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search patient or ID..."
                className="w-full py-2 pl-9 pr-4 rounded-lg bg-slate-100 focus:bg-white text-xs font-semibold text-[#17385E] placeholder-slate-400 border border-slate-200 focus:border-[#137C8B] focus:ring-2 focus:ring-[#137C8B]/20 transition-colors outline-none"
              />
            </div>
          )}

          {/* Current Date Widget */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-[#17385E]">
            <Calendar className="w-3.5 h-3.5 text-[#18A6A1]" />
            <span>{currentDate}</span>
          </div>

          {/* Patient App Switcher */}
          <Link
            to="/patient/entry"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#137C8B] hover:bg-[#0D6471] transition-colors cursor-pointer"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Patient Intake</span>
          </Link>

        </div>

      </div>
    </header>
  );
}
