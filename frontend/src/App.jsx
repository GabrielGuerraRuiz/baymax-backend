import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import BaymaxChatWidget from './components/BaymaxChatWidget';
import Login from './pages/Login';
import Register from './pages/Register';
import PacienteDashboard from './pages/PacienteDashboard';
import TutorDashboard from './pages/TutorDashboard';
import DoctorDashboard from './pages/DoctorDashboard';

function ProtectedLayout({ allowedRole, children }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRole && user?.rol !== allowedRole) {
    const dest = user?.rol === 'DOCTOR' ? '/doctor' : user?.rol === 'TUTOR' ? '/tutor' : '/paciente';
    return <Navigate to={dest} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      <BaymaxChatWidget />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route
            path="/paciente"
            element={
              <ProtectedLayout allowedRole="PACIENTE">
                <PacienteDashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/tutor"
            element={
              <ProtectedLayout allowedRole="TUTOR">
                <TutorDashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/doctor"
            element={
              <ProtectedLayout allowedRole="DOCTOR">
                <DoctorDashboard />
              </ProtectedLayout>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}