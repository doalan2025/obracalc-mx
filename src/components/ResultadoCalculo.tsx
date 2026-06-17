/**
 * Componente reutilizable para mostrar el resultado de cualquier cálculo.
 * Lo usan las pantallas nuevas de losa-maciza, zapata, escalera, yeso,
 * impermeabilización, tablaroca y cisterna para no duplicar UI.
 */

import { StyleSheet, Text, View } from 'react-native';
import { Card, colors, Row } from './UI';
import { GuardarEnProyectoButton } from './GuardarEnProyectoButton';
import { formatoEntero, formatoMXN, formatoNumero } from '@/utils/formato';
import type { ResultadoCalculo } from '@/core/types';
import type { TipoCalculo } from '@/store/proyectosStore';

type Props = {
  resultado: ResultadoCalculo | null;
  tipo: TipoCalculo;
  etiqueta: string;
  inputs: Record<string, unknown>;
  /** Texto a mostrar cuando no hay resultado. */
  vacio?: string;
};

export function ResultadoCalculoView({
  resultado,
  tipo,
  etiqueta,
  inputs,
  vacio = 'Captura los datos para ver el resultado.',
}: Props) {
  if (!resultado) {
    return (
      <Card>
        <Text style={{ color: colors.textMuted }}>{vacio}</Text>
      </Card>
    );
  }

  return (
    <>
      {resultado.resumen.length > 0 ? (
        <Card>
          <Text style={styles.section}>Resumen</Text>
          {resultado.resumen.map((r, i) => (
            <Row key={i} left={r.etiqueta} right={r.valor} />
          ))}
        </Card>
      ) : null}

      <Card>
        <Text style={styles.section}>Materiales</Text>
        {resultado.materiales.map((m) => (
          <View key={m.material} style={styles.matBlock}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.matName}>{m.etiqueta}</Text>
              <Text style={styles.matValue}>{formatoCantidad(m.cantidad, m.unidad)}</Text>
            </View>
            {m.equivalencias?.map((e, i) => (
              <Text key={i} style={styles.matEq}>
                └─ {e.etiqueta}: {formatoCantidad(e.valor, e.unidad)}
              </Text>
            ))}
            {m.costoTotal ? (
              <Text style={styles.matCost}>Costo: {formatoMXN(m.costoTotal)}</Text>
            ) : null}
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.section}>Mano de obra</Text>
        {resultado.manoObra.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>
            Sin mano de obra. Configura una tarifa o usa la tarifa libre.
          </Text>
        ) : (
          resultado.manoObra.map((mo) => (
            <View key={mo.conceptoId} style={{ marginBottom: 6 }}>
              <Row
                left={mo.nombre}
                right={`${formatoNumero(mo.cantidad, 2)} ${mo.unidad} × ${formatoMXN(mo.tarifa)}`}
              />
              <Row left="Total M.O." right={formatoMXN(mo.total)} bold />
            </View>
          ))
        )}
      </Card>

      <Card>
        <Row left="Costo materiales" right={formatoMXN(resultado.costoMateriales)} />
        <Row left="Costo mano de obra" right={formatoMXN(resultado.costoManoObra)} />
        <Row left="TOTAL" right={formatoMXN(resultado.costoTotal)} bold />
      </Card>

      <GuardarEnProyectoButton
        tipo={tipo}
        etiqueta={etiqueta}
        inputs={inputs}
        resultado={resultado}
      />
    </>
  );
}

function formatoCantidad(valor: number, unidad: string): string {
  if (unidad === 'kg' || unidad === 'L' || unidad === 'pza' || unidad === 'sacos' ||
      unidad === 'botes' || unidad === 'rollos' || unidad === 'cubetas' ||
      unidad === 'galones' || unidad === 'bultos') {
    return `${formatoEntero(valor)} ${unidad}`;
  }
  return `${formatoNumero(valor, 3)} ${unidad}`;
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  matBlock: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  matName: { fontSize: 14, fontWeight: '700', color: colors.text },
  matValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
  matEq: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  matCost: { fontSize: 13, color: colors.success, marginTop: 4, fontWeight: '700' },
});
