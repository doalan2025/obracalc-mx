/** Utilidades de formato de números en español-México. */

/** Formatea como moneda MXN. */
export const formatoMXN = (valor: number): string => {
  if (!isFinite(valor)) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
};

/** Formatea un número decimal con n decimales. */
export const formatoNumero = (valor: number, decimales = 2): string => {
  if (!isFinite(valor)) return '—';
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
};

/** Formatea un entero con separador de miles. */
export const formatoEntero = (valor: number): string => {
  if (!isFinite(valor)) return '—';
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(
    Math.round(valor),
  );
};

/** Convierte un string de input a número, tolerando comas o espacios. */
export const parsearNumero = (texto: string): number => {
  if (texto == null) return NaN;
  const limpio = String(texto).replace(/\s/g, '').replace(',', '.');
  const n = Number(limpio);
  return isNaN(n) ? NaN : n;
};
