import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({
    nombre: '',
    correo: '',
    contrasena: '',
    rol: 'PACIENTE',
    telefono: '',
    fecha_nacimiento: '',
    especialidad: '',
    cedula_profesional: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      nombre: form.nombre,
      correo: form.correo,
      contrasena: form.contrasena,
      rol: form.rol,
      ...(form.telefono && { telefono: form.telefono }),
      ...(form.fecha_nacimiento && { fecha_nacimiento: form.fecha_nacimiento }),
      ...(form.rol === 'DOCTOR' && {
        especialidad: form.especialidad,
        cedula_profesional: form.cedula_profesional,
      }),
    };

    try {
      await register(payload);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        Array.isArray(detail)
          ? detail.map((d) => `${d.loc.slice(-1)}: ${d.msg}`).join(' | ')
          : detail || 'Error al registrar el usuario.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mb-3">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Crear cuenta en Baymax</h1>
          <p className="text-sm text-slate-500 mt-1">Selecciona tu perfil para comenzar</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Registro exitoso. Redirigiendo al inicio de sesión...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de cuenta</label>
            <select
              name="rol"
              value={form.rol}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="PACIENTE">Paciente</option>
              <option value="TUTOR">Tutor / Familiar responsable</option>
              <option value="DOCTOR">Médico / Especialista</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
            <input
              type="text"
              name="nombre"
              required
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ej. Ana Pérez"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
            <input
              type="email"
              name="correo"
              required
              value={form.correo}
              onChange={handleChange}
              placeholder="correo@ejemplo.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              name="contrasena"
              required
              minLength={6}
              value={form.contrasena}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input
                type="tel"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                placeholder="5512345678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha nacimiento</label>
              <input
                type="date"
                name="fecha_nacimiento"
                value={form.fecha_nacimiento}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {form.rol === 'DOCTOR' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Especialidad</label>
                <input
                  type="text"
                  name="especialidad"
                  required
                  value={form.especialidad}
                  onChange={handleChange}
                  placeholder="Cardiología"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cédula prof.</label>
                <input
                  type="text"
                  name="cedula_profesional"
                  required
                  value={form.cedula_profesional}
                  onChange={handleChange}
                  placeholder="12345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white font-medium rounded-xl transition cursor-pointer mt-2"
          >
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-sky-600 font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}