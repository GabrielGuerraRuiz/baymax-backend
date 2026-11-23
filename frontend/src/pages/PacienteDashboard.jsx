import { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Pill,
  FileText,
  CheckCircle2,
  XCircle,
  PlusCircle,
  AlertCircle,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export default function PacienteDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('citas');

  const [doctores, setDoctores] = useState([]);
  const [citas, setCitas] = useState([]);
  const [tomas, setTomas] = useState([]);
  const [estudios, setEstudios] = useState([]);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // Estado para agendar cita
  const [doctorId, setDoctorId] = useState('');
  const [fecha, setFecha] = useState('');
  const [horarios, setHorarios] = useState([]);
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  const [motivo, setMotivo] = useState('');
  const [loadingAgendar, setLoadingAgendar] = useState(false);

  // Estado para subir resultado de estudio
  const [estudioEditando, setEstudioEditando] = useState(null);
  const [resultadoTexto, setResultadoTexto] = useState('');
  const [archivoUrl, setArchivoUrl] = useState('');

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback({ type: '', text: '' }), 4000);
  };

  const cargarDatos = async () => {
    try {
      const [docsRes, citasRes] = await Promise.all([
        axiosClient.get('/citas/doctores'),
        axiosClient.get('/citas/mis-citas'),
      ]);
      setDoctores(docsRes.data);
      setCitas(citasRes.data);

      const pacienteId = citasRes.data[0]?.paciente_id || user?.id;
      if (pacienteId) {
        const [tomasRes, estudiosRes] = await Promise.allSettled([
          axiosClient.get(`/clinico/tomas/paciente/${pacienteId}`),
          axiosClient.get(`/clinico/estudios/paciente/${pacienteId}`),
        ]);
        if (tomasRes.status === 'fulfilled') setTomas(tomasRes.value.data);
        if (estudiosRes.status === 'fulfilled') setEstudios(estudiosRes.value.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Consultar horarios libres cuando cambia doctor o fecha
  useEffect(() => {
    if (!doctorId || !fecha) {
      setHorarios([]);
      setHoraSeleccionada('');
      return;
    }
    const fetchHorarios = async () => {
      try {
        const { data } = await axiosClient.get(`/citas/horarios-libres/${doctorId}`, {
          params: { fecha },
        });
        setHorarios(data);
        setHoraSeleccionada('');
      } catch {
        setHorarios([]);
      }
    };
    fetchHorarios();
  }, [doctorId, fecha]);

  const handleAgendar = async (e) => {
    e.preventDefault();
    if (!doctorId || !fecha || !horaSeleccionada) return;
    setLoadingAgendar(true);

    const fechaHoraISO = horaSeleccionada.includes('T')
      ? horaSeleccionada
      : `${fecha}T${horaSeleccionada.length === 5 ? `${horaSeleccionada}:00` : horaSeleccionada}`;

    try {
      await axiosClient.post('/citas/', {
        doctor_id: doctorId,
        fecha_hora: fechaHoraISO,
        motivo: motivo || 'Consulta general',
      });
      showFeedback('success', 'Cita agendada correctamente.');
      setMotivo('');
      setHoraSeleccionada('');
      cargarDatos();
    } catch (err) {
      const detail = err.response?.data?.detail;
      showFeedback('error', typeof detail === 'string' ? detail : 'No se pudo agendar la cita.');
    } finally {
      setLoadingAgendar(false);
    }
  };

  const handleCancelarCita = async (citaId) => {
    try {
      await axiosClient.patch(`/citas/${citaId}/cancelar`);
      showFeedback('success', 'Cita cancelada.');
      cargarDatos();
    } catch (err) {
      showFeedback('error', err.response?.data?.detail || 'No se pudo cancelar la cita.');
    }
  };

  const handleMarcarToma = async (tomaId) => {
    try {
      await axiosClient.patch(`/clinico/tomas/${tomaId}/marcar`);
      showFeedback('success', 'Toma registrada como completada.');
      cargarDatos();
    } catch (err) {
      showFeedback('error', err.response?.data?.detail || 'Error al marcar la toma.');
    }
  };

  const handleSubirResultado = async (e) => {
    e.preventDefault();
    if (!estudioEditando) return;
    try {
      await axiosClient.patch(`/clinico/estudios/${estudioEditando}/resultado`, {
        resultado_texto: resultadoTexto,
        archivo_url: archivoUrl || null,
      });
      showFeedback('success', 'Resultado del estudio guardado.');
      setEstudioEditando(null);
      setResultadoTexto('');
      setArchivoUrl('');
      cargarDatos();
    } catch (err) {
      showFeedback('error', err.response?.data?.detail || 'Error al subir resultado.');
    }
  };

  const getDoctorName = (id) => {
    const doc = doctores.find((d) => d.doctor_id === id);
    return doc ? `${doc.nombre} (${doc.especialidad})` : 'Médico asignado';
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Panel del Paciente</h1>
          <p className="text-sm text-slate-500">Administra tus citas, medicamentos y estudios clínicos</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-xs w-fit">
          {[
            { id: 'citas', label: 'Mis Citas', icon: Calendar },
            { id: 'tomas', label: 'Medicamentos', icon: Pill },
            { id: 'estudios', label: 'Estudios', icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === id
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerta de feedback */}
      {feedback.text && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* TAB 1: CITAS */}
      {activeTab === 'citas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario Agendar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs h-fit">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <PlusCircle className="w-5 h-5 text-sky-600" />
              Agendar nueva cita
            </h2>
            <form onSubmit={handleAgendar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Médico</label>
                <select
                  required
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">Selecciona un especialista</option>
                  {doctores.map((doc) => (
                    <option key={doc.doctor_id} value={doc.doctor_id}>
                      {doc.nombre} — {doc.especialidad}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Horario disponible</label>
                {horarios.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">
                    {doctorId && fecha
                      ? 'Sin horarios libres para esta fecha.'
                      : 'Selecciona médico y fecha para ver horarios.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {horarios.map((h) => (
                      <button
                        type="button"
                        key={h}
                        onClick={() => setHoraSeleccionada(h)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                          horaSeleccionada === h
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-sky-400'
                        }`}
                      >
                        {h.slice(0, 5)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej. Revisión general"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={loadingAgendar || !horaSeleccionada}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 text-white font-medium rounded-xl text-sm transition cursor-pointer"
              >
                {loadingAgendar ? 'Agendando...' : 'Confirmar cita'}
              </button>
            </form>
          </div>

          {/* Lista de Citas */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Historial y próximas citas</h2>
            {citas.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Aún no tienes citas registradas.</p>
            ) : (
              <div className="space-y-3">
                {citas.map((cita) => (
                  <div
                    key={cita.id}
                    className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{getDoctorName(cita.doctor_id)}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(cita.fecha_hora).toLocaleString('es-MX', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                      {cita.motivo && <p className="text-xs text-slate-600 mt-1">Motivo: {cita.motivo}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          cita.estado === 'PROGRAMADA'
                            ? 'bg-sky-50 text-sky-700'
                            : cita.estado === 'ATENDIDA'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {cita.estado}
                      </span>
                      {cita.estado === 'PROGRAMADA' && (
                        <button
                          onClick={() => handleCancelarCita(cita.id)}
                          className="text-xs text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MEDICAMENTOS */}
      {activeTab === 'tomas' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Cronograma de medicamentos</h2>
          {tomas.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No tienes tomas de medicamentos programadas.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tomas.map((toma) => (
                <div
                  key={toma.id}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                    toma.tomada ? 'bg-emerald-50/40 border-emerald-200' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">
                      {toma.nombre_medicamento} <span className="font-normal text-slate-500">({toma.dosis})</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Programada: {new Date(toma.fecha_hora_programada).toLocaleString('es-MX')}
                    </p>
                  </div>
                  {toma.tomada ? (
                    <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Tomada
                    </span>
                  ) : (
                    <button
                      onClick={() => handleMarcarToma(toma.id)}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded-lg transition cursor-pointer"
                    >
                      Marcar tomada
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ESTUDIOS CLÍNICOS */}
      {activeTab === 'estudios' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Mis estudios clínicos</h2>
          {estudios.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No tienes órdenes de estudios registradas.</p>
          ) : (
            <div className="space-y-3">
              {estudios.map((est) => (
                <div key={est.id} className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800 text-sm">{est.tipo_estudio}</p>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {est.estado}
                    </span>
                  </div>
                  {est.indicaciones && <p className="text-xs text-slate-500">Indicaciones: {est.indicaciones}</p>}
                  {est.resultado_texto ? (
                    <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700">
                      <strong>Resultado:</strong> {est.resultado_texto}
                    </div>
                  ) : (
                    <button
                      onClick={() => setEstudioEditando(est.id)}
                      className="text-xs text-sky-600 font-medium hover:underline cursor-pointer"
                    >
                      Subir resultado del laboratorio
                    </button>
                  )}

                  {estudioEditando === est.id && (
                    <form onSubmit={handleSubirResultado} className="pt-2 space-y-2 border-t border-slate-100">
                      <textarea
                        required
                        rows={2}
                        value={resultadoTexto}
                        onChange={(e) => setResultadoTexto(e.target.value)}
                        placeholder="Describe los resultados del estudio..."
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <input
                        type="url"
                        value={archivoUrl}
                        onChange={(e) => setArchivoUrl(e.target.value)}
                        placeholder="URL del PDF/imagen (opcional)"
                        className="w-full p-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-sky-600 text-white text-xs font-medium rounded-lg cursor-pointer"
                        >
                          Guardar resultado
                        </button>
                        <button
                          type="button"
                          onClick={() => setEstudioEditando(null)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}