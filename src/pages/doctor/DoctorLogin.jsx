import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, Stethoscope, UserRound } from 'lucide-react';

const DOCTOR_SESSION_KEY = 'medsync_doctor_authenticated';
const DOCTOR_ID = 'rohan';
const DOCTOR_PASSWORD = '1234';

export function isDoctorAuthenticated() {
  return sessionStorage.getItem(DOCTOR_SESSION_KEY) === 'true';
}

export default function DoctorLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [doctorId, setDoctorId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isDoctorAuthenticated()) {
    return <Navigate to="/doctor/dashboard" replace />;
  }

  const handleSubmit = (event) => {
    event.preventDefault();

    if (doctorId.trim() === DOCTOR_ID && password === DOCTOR_PASSWORD) {
      sessionStorage.setItem(DOCTOR_SESSION_KEY, 'true');
      const destination = location.state?.from?.pathname || '/doctor/dashboard';
      navigate(destination, { replace: true });
      return;
    }

    setError('Invalid doctor ID or password.');
  };

  return (
    <main className="min-h-screen bg-[#F4FAFA] px-6 py-10 text-[#17385E]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-3xl border border-[#D7EAE9] bg-white shadow-xl shadow-[#17385E]/10 md:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden overflow-hidden bg-[#17385E] p-12 text-white md:block">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[32px] border-[#18A6A1]/30" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full border-[32px] border-[#7ED6CD]/20" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="mb-12 flex items-center gap-3">
                  <div className="rounded-xl bg-[#18A6A1] p-2.5">
                    <Stethoscope size={24} />
                  </div>
                  <span className="text-xl font-bold tracking-tight">Medsync</span>
                </div>
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#7ED6CD]">Doctor portal</p>
                <h1 className="max-w-sm text-4xl font-bold leading-tight">A clearer view of every patient story.</h1>
              </div>
              <p className="max-w-sm text-sm leading-6 text-white/70">Review patient histories, spot risks early, and keep clinical decisions grounded in complete records.</p>
            </div>
          </div>

          <div className="p-8 sm:p-12">
            <div className="mb-10 md:hidden">
              <div className="mb-5 inline-flex rounded-xl bg-[#18A6A1] p-2.5 text-white">
                <Stethoscope size={24} />
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#18A6A1]">Medsync doctor portal</p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-500">Sign in to access the clinical dashboard.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block text-sm font-semibold">
                Doctor ID
                <span className="relative mt-2 block">
                  <UserRound className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none transition focus:border-[#18A6A1] focus:ring-2 focus:ring-[#18A6A1]/20"
                    value={doctorId}
                    onChange={(event) => setDoctorId(event.target.value)}
                    autoComplete="username"
                    required
                  />
                </span>
              </label>

              <label className="block text-sm font-semibold">
                Password
                <span className="relative mt-2 block">
                  <LockKeyhole className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    type="password"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none transition focus:border-[#18A6A1] focus:ring-2 focus:ring-[#18A6A1]/20"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </span>
              </label>

              {error && <p className="text-sm font-medium text-red-600" role="alert">{error}</p>}

              <button className="w-full rounded-xl bg-[#18A6A1] px-5 py-3.5 font-bold text-white transition hover:bg-[#128D89] focus:outline-none focus:ring-2 focus:ring-[#18A6A1] focus:ring-offset-2" type="submit">
                Enter doctor portal
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
