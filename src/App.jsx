import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PatientAuthEntry from './pages/PatientAuthEntry';
import PatientLogin from './pages/PatientLogin';
import PatientRegister from './pages/PatientRegister';
import PatientDetails from './pages/PatientDetails';
import MedicalRecords from './pages/MedicalRecords';
import PatientChat from './pages/PatientChat';
import PatientDashboard from './pages/PatientDashboard';
import PatientSummary from './pages/PatientSummary';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientRecordView from './pages/doctor/PatientRecordView';
import DoctorLogin, { isDoctorAuthenticated } from './pages/doctor/DoctorLogin';

function DoctorRoute({ children }) {
  if (!isDoctorAuthenticated()) {
    return <Navigate to="/doctor/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Homepage */}
        <Route path="/" element={<HomePage />} />

        {/* Patient Entry / Authentication Selection */}
        <Route path="/patient/entry" element={<PatientAuthEntry />} />
        <Route path="/get-started" element={<PatientAuthEntry />} />

        {/* Patient Login (real, validates against backend) */}
        <Route path="/patient/login" element={<PatientLogin />} />

        {/* New Patient Registration Flow */}
        <Route path="/patient/register" element={<PatientRegister />} />
        <Route path="/patient/register/details" element={<PatientDetails />} />

        {/* Patient Dashboard */}
        <Route path="/patient/dashboard" element={<PatientDashboard />} />

        {/* OPD / Medical Document Reader */}
        <Route path="/patient/records" element={<MedicalRecords />} />

        {/* AI Health History Chatbot Interview */}
        <Route path="/patient/chat" element={<PatientChat />} />
        <Route path="/patient/summary" element={<PatientSummary />} />

        {/* Doctor Dashboard & Physician Clinical Viewer */}
        <Route path="/doctor/login" element={<DoctorLogin />} />
        <Route path="/doctor/dashboard" element={<DoctorRoute><DoctorDashboard /></DoctorRoute>} />
        <Route path="/doctor/patient/:patientId" element={<DoctorRoute><PatientRecordView /></DoctorRoute>} />

        {/* Catch-all redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
