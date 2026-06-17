import { describe, it, expect } from 'vitest';
import { formatoEntero, formatoNumero, parsearNumero } from './formato';

describe('Utilidades de formato', () => {
  it('formatoNumero respeta decimales', () => {
    expect(formatoNumero(1234.5678, 2)).toMatch(/1[.,]234[.,]57/);
    expect(formatoNumero(0, 0)).toBe('0');
  });

  it('formatoEntero redondea', () => {
    expect(formatoEntero(2.7)).toBe('3');
    expect(formatoEntero(0.4)).toBe('0');
  });

  it('parsearNumero acepta coma decimal', () => {
    expect(parsearNumero('3,5')).toBe(3.5);
    expect(parsearNumero('  10 ')).toBe(10);
    expect(Number.isNaN(parsearNumero('abc'))).toBe(true);
  });
});
