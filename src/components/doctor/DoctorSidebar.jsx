import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Activity, 
  LayoutDashboard, 
  Users, 
  AlertTriangle, 
  FileText, 
  ShieldCheck, 
  LogOut,
  Stethoscope,
  ChevronRight
} from 'lucide-react';

export default function DoctorSidebar({ redFlagsCount = 0 }) {
  const location = useLocation();

  const navItems = [
    {
      name: 'Dashboard',
      href: '/doctor/dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      name: 'All Patients',
      href: '/doctor/dashboard#patients',
      icon: Users,
      badge: null
    },
    {
      name: 'Red Flag Alerts',
      href: '/doctor/dashboard?filter=red_flags',
      icon: AlertTriangle,
      badge: redFlagsCount > 0 ? redFlagsCount : null,
      badgeColor: 'bg-red-500 text-white'
    },
    {
      name: 'Patient Intake App',
      href: '/',
      icon: Stethoscope,
      badge: 'Switch',
      badgeColor: 'bg-slate-100 text-slate-600'
    }
  ];

  const navigation = (
    <nav className="p-3 space-y-1">
      <div className="px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Clinical Workspace
      </div>

      {navItems.map((item) => {
        const Icon = item.icon;
        const itemPath = item.href.split('#')[0];
        const hashMatch = item.href.includes('#') ? location.hash === `#${item.href.split('#')[1]}` : true;
        const isActive = location.pathname === itemPath && hashMatch;

        return (
          <Link
            key={item.name}
            to={item.href}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isActive
                ? 'bg-[#EAFafa] text-[#18A6A1] shadow-2xs border border-[#18A6A1]/20'
                : 'text-slate-600 hover:text-[#17385E] hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#18A6A1]' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </div>

            {item.badge && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/doctor/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-extrabold tracking-tight text-[#17385E]">Med<span className="text-[#18A6A1]">Sync</span></span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block -mt-0.5">Physician Portal</span>
            </div>
          </Link>
          <Link to="/" title="Log Out / Switch to Home" className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
        <div className="px-3 pb-3 flex gap-2 overflow-x-auto">
          {navItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href.split('#')[0] && (!item.href.includes('#') || location.hash === `#${item.href.split('#')[1]}`);
            return <Link key={item.name} to={item.href} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap text-[11px] font-bold border ${isActive ? 'bg-[#EAFafa] text-[#18A6A1] border-[#18A6A1]/20' : 'bg-slate-50 text-slate-600 border-slate-200'}`}><Icon className="w-3.5 h-3.5" />{item.name}{item.badge && <span className="text-[9px] px-1.5 rounded-full bg-red-500 text-white">{item.badge}</span>}</Link>;
          })}
        </div>
      </div>

      <aside className="hidden md:flex md:w-64 bg-white border-r border-slate-200/80 min-h-screen flex-col justify-between shrink-0 shadow-xs">
      
      {/* Top Branding & Navigation */}
      <div>
        
        {/* Brand Logo */}
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <Link to="/doctor/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] flex items-center justify-center shadow-md shadow-[#18A6A1]/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="text-lg font-extrabold tracking-tight text-[#17385E]">
                  Med<span className="text-[#18A6A1]">Sync</span>
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block -mt-1">
                Physician Portal
              </span>
            </div>
          </Link>
        </div>

        {navigation}

      </div>

      {/* Bottom Profile & Security Status */}
      <div className="p-3 border-t border-slate-200/80 space-y-3">
        
        {/* Security Indicator */}
        <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#17385E] truncate">Secure clinical workspace</p>
            <p className="text-[10px] text-slate-400 truncate">Role-based physician access</p>
          </div>
        </div>

        {/* Doctor Profile Card */}
        <div className="p-2.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#17385E] to-[#1a8fa8] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
              AR
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-[#17385E] truncate">Dr. Ananya Ray</p>
              <p className="text-[10px] font-medium text-slate-400 truncate">MD, Internal Medicine</p>
            </div>
          </div>

          <Link
            to="/"
            title="Log Out / Switch to Home"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>

      </div>

      </aside>
    </>
  );
}
