import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import HowItWorks from '../components/HowItWorks';
import Features from '../components/Features';
import DoctorSection from '../components/DoctorSection';
import SafetySection from '../components/SafetySection';
import AboutSection from '../components/AboutSection';
import CTA from '../components/CTA';
import Footer from '../components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FBFC] text-[#17385E] selection:bg-[#18A6A1] selection:text-white">
      {/* Navigation Bar */}
      <Navbar />

      {/* Main Page Sections */}
      <main className="flex-grow">
        {/* 1. Hero Section */}
        <Hero />

        {/* 2. How MedSync Works (5 Steps) */}
        <HowItWorks />

        {/* 3. Features ("Less paperwork. More context.") */}
        <Features />

        {/* 4. For Doctors ("See the patient, not the paperwork.") */}
        <DoctorSection />

        {/* 5. Responsible AI Safety Section */}
        <SafetySection />

        {/* 6. About MedSync */}
        <AboutSection />

        {/* 7. Final Call to Action */}
        <CTA />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
