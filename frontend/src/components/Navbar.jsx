import { HeartPulse, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_STYLES = {
  PACIENTE: { label: 'Paciente', classes: 'bg-sky-50 text-sky-700 border-sky-200' },
  TUTOR: { label: 'Tutor / Familiar', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  DOCTOR: { label: 'Médico', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const roleInfo = ROLE_STYLES[user?.rol] || ROLE_STYLES.PACIENTE;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-600 text-white rounded-xl flex items-center justify-center shadow-sm">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-800 tracking-tight">Baymax Salud</span>
            <span className="hidden sm:inline-block text-xs text-slate-400 ml-2">
              Gestión Clínica &amp; Asistente IA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-slate-800 leading-none">{user?.nombre}</p>
              <p className="text-xs text-slate-400 mt-0.5">{user?.correo}</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${roleInfo.classes}`}>
              {roleInfo.label}
            </span>
          </div>

          <button
            onClick={logout}
            title="Cerrar sesión"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}