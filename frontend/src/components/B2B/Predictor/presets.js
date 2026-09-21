export const DEFAULT_PARAMS = {
  sueldo: 2400,
  tiempoTraslado: 35,
  turnosFijos: true,
  apoyoInea: true
};

export const PRESETS = [
  {
    name: 'Turnos Rotativos Críticos',
    desc: 'Salario base, sin transporte, alta deserción',
    params: { sueldo: 1700, tiempoTraslado: 65, turnosFijos: false, apoyoInea: false }
  },
  {
    name: 'Planta Estándar Apodaca',
    desc: 'Promedio manufacturero actual',
    params: { sueldo: 2200, tiempoTraslado: 30, turnosFijos: false, apoyoInea: false }
  },
  {
    name: 'Estrategia de Fidelidad INEA',
    desc: 'Turno fijo + Aula INEA de alta retención',
    params: { sueldo: 2500, tiempoTraslado: 25, turnosFijos: true, apoyoInea: true }
  }
];

export function badgeColorForLevel(level) {
  switch (level) {
    case 'Excelente':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'Alto':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Medio':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    default:
      return 'bg-rose-100 text-rose-800 border-rose-300';
  }
}
