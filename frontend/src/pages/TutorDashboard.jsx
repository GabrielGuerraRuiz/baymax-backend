        import { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Link2,
  Calendar,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';

export default function TutorDashboard() {
  const [dependientes, setDependientes] = useState([]);
  const [doctores, setDoctores] = useState([]);
  const [citas, setCitas] = useState([]);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // Form nuevo dependiente
  const [nuevoDep, setNuevoDep] = useState({ nombre: '', fecha_nacimiento: '', parentesco: '' });
  // Form vincular existente
  const [vincular, setVincular] = useState({ correo_paciente: '', parentesco: '' });

  // Form agendar cita para dependiente
  const [pacienteId, setPacienteId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [fecha, setFecha] = useState('');
  const [horarios, setHorarios] = useState([]);
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  const [motivo, setMotivo] = useState('');

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback({ type: '', text: '' }), 4000);
  };

  const cargarDatos = async () => {
    try {
      const [depRes, docRes, citasRes] = await Promise.all([
        axiosClient.get('/tutores/dependientes'),
        axiosClient.get('/citas/doctores'),
        axiosClient.get('/citas/mis-citas'),
      ]);
      setDependientes(depRes.data);
      setDoctores(docRes.data);
      setCitas(citasRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (!doctorId || !fecha) {
      setHorarios([]);
      setHoraSeleccionada('');
      return;
    }
    axiosClient
      .get(`/citas/horarios-libres/${doctorId}`, {
        params: { fecha, ...(pacienteId && { paciente_id: pacienteId }) },
      })
      .then(({ data }) => {
        setHorarios(data);
        setHoraSeleccionada('');
      })
      .catch(() => setHorarios([]));
  }, [doctorId, fecha, pacienteId]);

  const handleCrearDependiente = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/tutores/dependientes', nuevoDep);
      showFeedback('success', 'Dependiente registrado correctamente.');
      setNuevoDep({ nombre: '', fecha_nacimiento: '', parentesco: '' });
      cargarDatos();
    } catch (err) {
      showFeedback('error', err.response?.data?.detail || 'Error al registrar dependiente.');
    }
  };

  const handleVincular = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/tutores/vincular', vincular);
      showFeedback('success', 'Paciente vinculado correctamente.');
      setVincular({ correo_paciente: '', parentesco: '' });
      cargarDatos();
    } catch (err) {
      showFeedback('error', err.response?.data?.detail || 'Error al vincular paciente.');
    }
  };

  const handleRevocar = async (vinculoId) => {
    try {
      await axiosClient.delete(`/tutores/vinculos/${vinculoId}`);
      showFeedback('success', 'Vínculo revocado.');
      cargarDatos();
    } catch (err) {
      showFeedback('error', err.response?.data?.detail || 'No se pudo revocar el vínculo.');
    }
  };

  const handleAgendarCita = async (e) => {
    e.preventDefault();
    if (!pacienteId || !doctorId || !fecha || !horaSeleccionada) return;
    const fechaHoraISO = horaSeleccionada.includes('T')
      ? horaSeleccionada
      : `${fecha}T${horaSeleccionada.length === 5 ? `${horaSeleccionada}:00` : horaSeleccionada}`;

    try {
      await axiosClient.post('/citas/', {
        doctor_id: doctorId,
        paciente_id: pacienteId,
        fecha_hora: fechaHoraISO,
        motivo: motivo || 'Consulta gestionada por tutor',
      });
      showFeedback('success', 'Cita agendada para tu dependiente.');
      setMotivo('');
      setHoraSeleccionada('');
      cargarDatos();
    } catch (err) {
      showFeedback('error', err.response?.data?.detail || 'Error al agendar cita.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Panel del Tutor</h1>
        <p className="text-sm text-slate-500">Gestiona tus familiares dependientes y agenda sus consultas</p>
      </div>

      {feedback.text && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Formularios de Dependientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form onSubmit={handleCrearDependiente} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3.5">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-sky-600" />
            Registrar dependiente (menor / sin cuenta)
          </h2>
          <input
            type="text"
            required
            placeholder="Nombre completo"
            value={nuevoDep.nombre}
            onChange={(e) => setNuevoDep({ ...nuevoDep, nombre: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              required
              value={nuevoDep.fecha_nacimiento}
              onChange={(e) => setNuevoDep({ ...nuevoDep, fecha_nacimiento: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <input
              type="text"
              required
              placeholder="Parentesco (Ej. Hijo)"
              value={nuevoDep.parentesco}
              onChange={(e) => setNuevoDep({ ...nuevoDep, parentesco: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <button type="submit" className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-xl cursor-pointer">
            Registrar dependiente
          </button>
        </form>

        <form onSubmit={handleVincular} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3.5">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-amber-600" />
            Vincular paciente con cuenta existente
          </h2>
          <input
            type="email"
            required
            placeholder="Correo del paciente"
            value={vincular.correo_paciente}
            onChange={(e) => setVincular({ ...vincular, correo_paciente: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <input
            type="text"
            required
            placeholder="Parentesco (Ej. Madre)"
            value={vincular.parentesco}
            onChange={(e) => setVincular({ ...vincular, parentesco: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl cursor-pointer">
            Vincular paciente
          </button>
        </form>
      </div>

      {/* Lista de Dependientes + Agendar Cita */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            Mis dependientes ({dependientes.length})
          </h2>
          {dependientes.length === 0 ? (
            <p className="text-xs text-slate-400">No tienes dependientes vinculados.</p>
          ) : (
            dependientes.map((dep) => (
              <div key={dep.vinculo_id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{dep.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {dep.parentesco} · Nac: {dep.fecha_nacimiento}
                  </p>
                </div>
                <button
                  onClick={() => handleRevocar(dep.vinculo_id)}
                  title="Revocar vínculo"
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAgendarCita} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-600" />
            Agendar cita para dependiente
          </h2>
          <select
            required
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="">Selecciona dependiente</option>
            {dependientes.map((d) => (
              <option key={d.paciente_id} value={d.paciente_id}>
                {d.nombre} ({d.parentesco})
              </option>
            ))}
          </select>

          <select
            required
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="">Selecciona médico</option>
            {doctores.map((doc) => (
              <option key={doc.doctor_id} value={doc.doctor_id}>
                {doc.nombre} — {doc.especialidad}
              </option>
            ))}
          </select>

          <input
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />

          {horarios.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {horarios.map((h) => (
                <button
                  type="button"
                  key={h}
                  onClick={() => setHoraSeleccionada(h)}
                  className={`py-1.5 rounded-lg text-xs border cursor-pointer ${
                    horaSeleccionada === h
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {h.slice(0, 5)}
                </button>
              ))}
            </div>
          )}

          <input
            type="text"
            placeholder="Motivo de la consulta"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />

          <button
            type="submit"
            disabled={!horaSeleccionada || !pacienteId}
            className="w-full py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 text-white text-sm font-medium rounded-xl cursor-pointer"
          >
            Agendar cita
          </button>
        </form>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <h2 className="text-base font-semibold text-slate-800">Citas agendadas ({citas.length})</h2>
          {citas.length === 0 ? (
            <p className="text-xs text-slate-400">Aún no has agendado citas.</p>
          ) : (
            citas.map((c) => (
              <div key={c.id} className="p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>{c.motivo || 'Consulta'}</span>
                  <span className="text-sky-600">{c.estado}</span>
                </div>
                <p className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(c.fecha_hora).toLocaleString('es-MX')}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}