/**
 * Catálogo de opciones para vacantes operativas.
 * Espejo de backend/app/constants/job_catalog.py (el backend valida contra su copia).
 * No incluye edad, sexo ni estado civil: la LFT (art. 133) prohíbe usarlos como requisito.
 */

export const CATEGORIAS = [
  'Operador de producción / Ensamble',
  'Montacarguista',
  'Almacén y logística',
  'Soldador',
  'Empaque y etiquetado',
  'Inspector de calidad',
  'Operador de maquinaria (CNC / prensa / inyección)',
  'Mantenimiento / Técnico',
  'Electricista / Instrumentista',
  'Pintura / Acabados',
  'Chofer / Repartidor',
  'Limpieza / Intendencia',
  'Ayudante general',
  'Otro',
];

export const TIPOS_TURNO = [
  'Fijo matutino',
  'Fijo vespertino',
  'Fijo nocturno',
  'Rotativo (rola turnos)',
  'Mixto',
  '12 horas (4x3)',
];

export const DIAS_LABORALES = ['Lunes a Viernes', 'Lunes a Sábado', '4x3', '5x2', '6x1', 'Variable'];

export const TIPOS_CONTRATO = [
  'Planta (tiempo indeterminado)',
  'Temporal (tiempo determinado)',
  'Por proyecto / obra',
  'Por agencia / outsourcing',
  'Eventual / temporada',
];

export const ESCOLARIDADES = [
  'Sin estudios',
  'Primaria',
  'Secundaria',
  'Preparatoria / Bachillerato',
  'Carrera técnica',
  'Licenciatura',
];

export const EXPERIENCIAS = ['Sin experiencia', '6 meses', '1 año', '2 años o más'];

// Catálogo del candidato (currículum operativo)
export const EXPERIENCIA_CANDIDATO = ['Sin experiencia', 'Menos de 6 meses', '6 meses a 1 año', '1 a 2 años', 'Más de 2 años'];
export const DISPONIBILIDADES = ['De inmediato', 'Esta semana', 'En 15 días', 'En un mes'];

export const PRESTACIONES = [
  'Prestaciones de ley (IMSS, Infonavit, aguinaldo, vacaciones)',
  'Prestaciones superiores a la ley',
  'Vales de despensa',
  'Fondo de ahorro',
  'Caja de ahorro',
  'Comedor subsidiado',
  'Transporte de personal',
  'Uniformes',
  'Seguro de vida',
  'Seguro de gastos médicos',
  'Bono de puntualidad',
  'Bono de asistencia',
  'Bono de productividad',
  'Tiempo extra pagado',
  'Pago semanal',
  'Apoyo para terminar estudios (INEA)',
];

export const CERTIFICACIONES = [
  'Licencia de montacargas (DC-3)',
  'Soldadura MIG / TIG / eléctrica',
  'Licencia de conducir (B, C o E)',
  'Operación de grúa viajera',
  'Curso de seguridad industrial',
  'Lectura de planos',
  'Metrología (vernier, micrómetro)',
  'Manejo de CNC',
  'Buenas prácticas de manufactura (BPM)',
];

export const REQUISITOS_FISICOS = [
  'Trabajo de pie prolongado',
  'Carga de peso (hasta 25 kg)',
  'Ambiente caliente',
  'Ambiente frío / refrigerado',
  'Trabajo en alturas',
  'Uso de equipo de protección (EPP)',
  'Disponibilidad para turno nocturno',
];

export const PRESTACION_TRANSPORTE = 'Transporte de personal';
export const PRESTACION_INEA = 'Apoyo para terminar estudios (INEA)';

/** Deduce el tipo de turno del catálogo a partir de un turno de la planta. */
export function tipoTurnoDesdeHorario(horaEntrada, tipoPlanta = '') {
  if ((tipoPlanta || '').toLowerCase().includes('rol')) return 'Rotativo (rola turnos)';
  const raw = String(horaEntrada || '');
  let hora = parseInt(raw.split(':')[0], 10);
  if (Number.isNaN(hora)) return 'Fijo matutino';
  if (raw.toLowerCase().includes('pm') && hora < 12) hora += 12;
  if (hora >= 4 && hora < 12) return 'Fijo matutino';
  if (hora >= 12 && hora < 20) return 'Fijo vespertino';
  return 'Fijo nocturno';
}
