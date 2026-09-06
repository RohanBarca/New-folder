import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Menu, X, ArrowRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

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
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 transition-all duration-200 ${isScrolled ? 'py-3 shadow-sm' : 'py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-[#137C8B] flex items-center justify-center">
              <Activity className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="flex items-baseline">
              <span className="text-xl font-bold tracking-tight text-[#17385E]">
                Med<span className="text-[#18A6A1]">Sync</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#137C8B] ml-0.5"></span>
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
            <ThemeToggle compact />
            <Link
              to="/doctor/dashboard"
              className="px-3.5 py-2 rounded-lg text-xs font-bold text-[#137C8B] hover:text-[#0D6471] bg-[#EAF5F6] hover:bg-[#DCEFF1] border border-[#B8D9DD] transition-colors cursor-pointer"
            >
              Doctor Portal
            </Link>
            <Link
              to="/patient/entry"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[#17385E] hover:text-[#137C8B] border border-[#CBD5E1] hover:border-[#137C8B] bg-white transition-colors cursor-pointer"
            >
              Log In
            </Link>
            <Link
              to="/patient/entry"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#137C8B] hover:bg-[#0D6471] transition-colors cursor-pointer"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle compact />
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
          <div className="md:hidden mt-4 pt-4 pb-6 px-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3 animate-fadeIn">
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

