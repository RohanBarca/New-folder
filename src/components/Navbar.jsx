import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Menu, X, ArrowRight } from 'lucide-react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '/#hero' },
    { name: 'How it Works', href: '/#how-it-works' },
    { name: 'Features', href: '/#features' },
    { name: 'For Doctors', href: '/#for-doctors' },
    { name: 'About Us', href: '/#about-us' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'glass-nav py-3.5 shadow-soft border-b border-[#18A6A1]/15'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] flex items-center justify-center shadow-md shadow-[#18A6A1]/20 group-hover:scale-105 transition-transform duration-200">
              <Activity className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-extrabold tracking-tight text-[#17385E]">
                Med<span className="text-[#18A6A1]">Sync</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#18A6A1] ml-0.5"></span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-semibold text-[#17385E]/80 hover:text-[#18A6A1] transition-colors duration-200"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/doctor/dashboard"
              className="px-3.5 py-2 rounded-full text-xs font-bold text-[#18A6A1] hover:text-[#148F8B] bg-[#EAFafa] hover:bg-[#18A6A1]/20 border border-[#18A6A1]/30 transition-all duration-200 cursor-pointer"
            >
              Doctor Portal
            </Link>
            <Link
              to="/patient/entry"
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-[#17385E] hover:text-[#18A6A1] border border-[#CBD5E1] hover:border-[#18A6A1] bg-white/70 hover:bg-[#EAFafa]/50 transition-all duration-200 cursor-pointer"
            >
              Log In
            </Link>
            <Link
              to="/patient/entry"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#18A6A1] hover:bg-[#148F8B] shadow-sm hover:shadow-teal-glow transition-all duration-200 cursor-pointer"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#17385E] hover:bg-[#EAFafa] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 stroke-[2]" />
              ) : (
                <Menu className="w-6 h-6 stroke-[2]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 pb-6 px-4 bg-white/95 backdrop-blur-xl rounded-2xl border border-[#18A6A1]/20 shadow-soft-lg space-y-3 animate-fadeIn">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-base font-medium text-[#17385E] hover:text-[#18A6A1] hover:bg-[#EAFafa] transition-colors"
              >
                {link.name}
              </a>
            ))}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              <Link
                to="/doctor/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl text-center text-sm font-bold text-[#18A6A1] bg-[#EAFafa] border border-[#18A6A1]/30 hover:bg-[#18A6A1]/20"
              >
                Doctor Portal
              </Link>
              <Link
                to="/patient/entry"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl text-center text-sm font-semibold text-[#17385E] border border-slate-200 hover:bg-slate-50"
              >
                Log In
              </Link>
              <Link
                to="/patient/entry"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl text-center text-sm font-semibold text-white bg-[#18A6A1] hover:bg-[#148F8B] shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

