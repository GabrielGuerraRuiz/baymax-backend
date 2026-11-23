import { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FilePlus2,
  Pill,
  AlertCircle,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function DoctorDashboard() {
  const [agenda, setAgenda] = useState([]);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // Form disponibilidad
  const [disp, setDisp] = useState({
    dia_semana: 0,
    hora_inicio: '09:00',
    hora_fin: '14:00',
    duracion_cita_min: 30,
  });

  // Modales inline sobre una cita seleccionada
  const [citaActiva, setCitaActiva] = useState(null);
  const [accionModal, setAccionModal] = useState(''); // 'estudio' | 'receta'

  const [estudio, setEstudio] = useState({ tipo_estudio: '', indicaciones: '' });
  const [receta, setReceta] = useState({
    diagnostico: '',
    observaciones: '',
    nombre_medicamento: '',
    dosis: '',
    frecuencia_horas: 8,
    duracion_dias: 5,
    indicaciones_extra: '',
  });

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback({ type: '', text: '' }), 4000);
  };

  const cargarAgenda = async () => {
    try {
      const { data } = await axiosClient.get('/citas/agenda-doctor');
      setAgenda(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargarAgenda();
  }, []);

  const handleAgregarDisponibilidad = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/citas/disponibilidad', {
        dia_semana: Number(disp.dia_semana),
        hora_inicio: `${disp.hora_inicio}:00`,
        hora_fin: `${disp.hora_fin}:00`,
        duracion_cita_min: Number(disp.duracion_cita_min),
      });
      showFeedback('success', 'Horario de disponibilidad agregado.');
    } catch (err) {
      showFeedback('error', err.response?.data?.detail || 'Error al guardar disponibilidad.');
    }
  };

  const handleAsistencia = async (citaId, estado) => {
    try {
      await axiosClient.patch(`/citas/${citaId}/asistencia`, { estado });
      showFeedback('success', `Cita marcada como ${estado}.`);
      cargarAgenda();
    } catch (err) {
      showFeedback('error', err.response?.data?.detail || 'No se pudo actualizar la asistencia.');
    }
  };

  const handleOrdenarEstudio = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/clinico/estudios', {
        cita_id: citaActiva,
        tipo_estudio: estudio.tipo_estudio,
        indicaciones: estudio.indicaciones || null,
      });
      showFeedback('success', 'Orden de estudio emitida.');
      setCitaActiva(null);
      setAccionModal('');
      setEstudio({ tipo_estudio: '', indicaciones: '' });
    } catch (err) {
      showFeedback('error', err.response?.data?.detail || 'Error al ordenar estudio.');
    }
  };

  const handleEmitirReceta = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/clinico/recetas', {
        cita_id: citaActiva,
        diagnostico: receta.diagnostico,
        observaciones: receta.observaciones || null,
        medicamentos: [
          {
            nombre_medicamento: receta.nombre_medicamento,
            dosis: receta.dosis,
            frecuencia_horas: Number(receta.frecuencia_horas),
            duracion_dias: Number(receta.duracion_dias),
            indicaciones_extra: receta.indicaciones_extra || null,
          },
        ],
      });
      showFeedback('success', 'Receta emitida y cronograma de tomas generado.');
      setCitaActiva(null);
      setAccionModal('');
      setReceta({
        diagnostico: '',
        observaciones: '',
        nombre_medicamento: '',
        dosis: '',
        frecuencia_horas: 8,
        duracion_dias: 5,
        indicaciones_extra: '',
      });
    } catch (err) {
      showFeedback('error', err.response?.data?.detail || 'Error al emitir receta.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Panel Médico</h1>
        <p className="text-sm text-slate-500">Controla tu agenda, disponibilidad, órdenes de estudio y recetas</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configurar Disponibilidad */}
        <form onSubmit={handleAgregarDisponibilidad} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 h-fit">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            Configurar disponibilidad
          </h2>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Día de la semana</label>
            <select
              value={disp.dia_semana}
              onChange={(e) => setDisp({ ...disp, dia_semana: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              {DIAS_SEMANA.map((dia, i) => (
                <option key={dia} value={i}>
                  {dia}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Inicio</label>
              <input
                type="time"
                required
                value={disp.hora_inicio}
                onChange={(e) => setDisp({ ...disp, hora_inicio: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fin</label>
              <input
                type="time"
                required
                value={disp.hora_fin}
                onChange={(e) => setDisp({ ...disp, hora_fin: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Duración por cita (min)</label>
            <input
              type="number"
              min={10}
              max={180}
              required
              value={disp.duracion_cita_min}
              onChange={(e) => setDisp({ ...disp, duracion_cita_min: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl cursor-pointer">
            Guardar horario
          </button>
        </form>

        {/* Agenda del Doctor */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-600" />
            Agenda de citas ({agenda.length})
          </h2>

          {agenda.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No hay citas programadas en tu agenda.</p>
          ) : (
            <div className="space-y-3">
              {agenda.map((cita) => (
                <div key={cita.id} className="p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(cita.fecha_hora).toLocaleString('es-MX', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                      <p className="text-xs text-slate-500">Motivo: {cita.motivo || 'Consulta general'}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 w-fit">
                      {cita.estado}
                    </span>
                  </div>

                  {/* Acciones médicas */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    {cita.estado === 'PROGRAMADA' && (
                      <>
                        <button
                          onClick={() => handleAsistencia(cita.id, 'ATENDIDA')}
                          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Atendida
                        </button>
                        <button
                          onClick={() => handleAsistencia(cita.id, 'NO_ASISTIO')}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> No asistió
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setCitaActiva(cita.id);
                        setAccionModal('estudio');
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 flex items-center gap-1 cursor-pointer"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" /> Ordenar estudio
                    </button>
                    <button
                      onClick={() => {
                        setCitaActiva(cita.id);
                        setAccionModal('receta');
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Pill className="w-3.5 h-3.5" /> Emitir receta
                    </button>
                  </div>

                  {/* Formulario inline: Ordenar estudio */}
                  {citaActiva === cita.id && accionModal === 'estudio' && (
                    <form onSubmit={handleOrdenarEstudio} className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-700">Nueva orden de estudio</p>
                      <input
                        type="text"
                        required
                        placeholder="Tipo de estudio (Ej. Biometría Hemática)"
                        value={estudio.tipo_estudio}
                        onChange={(e) => setEstudio({ ...estudio, tipo_estudio: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Indicaciones (Ej. Ayuno de 8 horas)"
                        value={estudio.indicaciones}
                        onChange={(e) => setEstudio({ ...estudio, indicaciones: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="px-3 py-1.5 bg-sky-600 text-white text-xs rounded-lg cursor-pointer">
                          Enviar orden
                        </button>
                        <button type="button" onClick={() => setCitaActiva(null)} className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs rounded-lg cursor-pointer">
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Formulario inline: Emitir receta */}
                  {citaActiva === cita.id && accionModal === 'receta' && (
                    <form onSubmit={handleEmitirReceta} className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-700">Emitir receta médica</p>
                      <input
                        type="text"
                        required
                        placeholder="Diagnóstico"
                        value={receta.diagnostico}
                        onChange={(e) => setReceta({ ...receta, diagnostico: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Medicamento (Ej. Amoxicilina 500mg)"
                          value={receta.nombre_medicamento}
                          onChange={(e) => setReceta({ ...receta, nombre_medicamento: e.target.value })}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Dosis (Ej. 1 cápsula)"
                          value={receta.dosis}
                          onChange={(e) => setReceta({ ...receta, dosis: e.target.value })}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={1}
                          required
                          placeholder="Cada cuántas horas"
                          value={receta.frecuencia_horas}
                          onChange={(e) => setReceta({ ...receta, frecuencia_horas: e.target.value })}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                        />
                        <input
                          type="number"
                          min={1}
                          required
                          placeholder="Duración en días"
                          value={receta.duracion_dias}
                          onChange={(e) => setReceta({ ...receta, duracion_dias: e.target.value })}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg cursor-pointer">
                          Emitir receta
                        </button>
                        <button type="button" onClick={() => setCitaActiva(null)} className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs rounded-lg cursor-pointer">
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
      </div>
    </div>
  );
}