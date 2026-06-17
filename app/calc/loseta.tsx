import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Card,
  colors,
  Label,
  NumberField,
  Pill,
  Row,
} from '@/components/UI';
import {
  calcularLoseta,
  FORMATOS_LOSETA,
  type FormatoPieza,
  type ModoEntradaLoseta,
} from '@/core/calculators/loseta';
import { useManoObraStore } from '@/store/manoObraStore';
import { usePreciosStore } from '@/store/preciosStore';
import {
  formatoEntero,
  formatoMXN,
  formatoNumero,
  parsearNumero,
} from '@/utils/formato';
import { GuardarEnProyectoButton } from '@/components/GuardarEnProyectoButton';

const FORMATO_IDS = Object.keys(FORMATOS_LOSETA);

export default function CalcLosetaScreen() {
  const { conceptos } = useManoObraStore();
  const { precios } = usePreciosStore();

  const [modo, setModo] = useState<ModoEntradaLoseta>('area');
  const [area, setArea] = useState('20');
  const [largo, setLargo] = useState('4');
  const [ancho, setAncho] = useState('3');
  const [formatoId, setFormatoId] = useState<string>('45x45');
  const [merma, setMerma] = useState('8');
  const [rendAdh, setRendAdh] = useState('5');
  const [pesoBoq, setPesoBoq] = useState('0.5');

  const formato: FormatoPieza | undefined =
    formatoId === 'sin' ? undefined : FORMATOS_LOSETA[formatoId];

  const resultado = useMemo(() => {
    return calcularLoseta({
      modo,
      area: parsearNumero(area),
      largo: parsearNumero(largo),
      ancho: parsearNumero(ancho),
      formato,
      mermaPct: parsearNumero(merma),
      rendimientoAdhesivoM2PorSaco: parsearNumero(rendAdh),
      pesoBoquillaKgM2: parsearNumero(pesoBoq),
      conceptosMO: conceptos,
      precios: {
        losetaM2: precios.losetaM2,
        adhesivoSaco: precios.adhesivoSaco,
        boquillaKg: precios.boquillaKg,
      },
    });
  }, [modo, area, largo, ancho, formato, merma, rendAdh, pesoBoq, conceptos, precios]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>1. Superficie a colocar</Text>
        <View style={[styles.chipRow, { marginBottom: 8 }]}>
          <Text
            onPress={() => setModo('area')}
            style={[styles.chip, modo === 'area' && styles.chipActive]}
          >
            Capturar área (m²)
          </Text>
          <Text
            onPress={() => setModo('dimensiones')}
            style={[styles.chip, modo === 'dimensiones' && styles.chipActive]}
          >
            Largo × ancho
          </Text>
        </View>
        {modo === 'area' ? (
          <NumberField label="Área" value={area} onChange={setArea} suffix="m²" />
        ) : (
          <>
            <NumberField label="Largo" value={largo} onChange={setLargo} suffix="m" />
            <NumberField label="Ancho" value={ancho} onChange={setAncho} suffix="m" />
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.section}>2. Formato de pieza</Text>
        <View style={styles.chipRow}>
          {FORMATO_IDS.map((id) => (
            <Text
              key={id}
              onPress={() => setFormatoId(id)}
              style={[styles.chip, formatoId === id && styles.chipActive]}
            >
              {FORMATOS_LOSETA[id].nombre} cm
            </Text>
          ))}
          <Text
            onPress={() => setFormatoId('sin')}
            style={[styles.chip, formatoId === 'sin' && styles.chipActive]}
          >
            Sin formato (sólo m²)
          </Text>
        </View>
        {formato ? (
          <Text style={styles.hint}>
            {formato.largoCm}×{formato.anchoCm} cm = {formatoNumero(
              (formato.largoCm * formato.anchoCm) / 10000,
              4,
            )}{' '}
            m²/pza
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.section}>3. Mermas y rendimientos</Text>
        <NumberField
          label="Merma de loseta"
          value={merma}
          onChange={setMerma}
          suffix="%"
        />
        <NumberField
          label="Rendimiento adhesivo"
          value={rendAdh}
          onChange={setRendAdh}
          suffix="m²/saco"
        />
        <Text style={styles.hint}>
          Saco de pegazulejo de 20 kg rinde 4–5 m² para piezas pequeñas, hasta
          7–10 m² en porcelanato grande.
        </Text>
        <NumberField
          label="Peso de boquilla"
          value={pesoBoq}
          onChange={setPesoBoq}
          suffix="kg/m²"
        />
      </Card>

      {resultado ? (
        <>
          <Card>
            <Text style={styles.section}>Resumen</Text>
            <Row left="Área neta" right={`${formatoNumero(resultado.areaNeta, 2)} m²`} />
            <Row
              left="Área a comprar"
              right={`${formatoNumero(resultado.areaConMerma, 2)} m²`}
              bold
            />
          </Card>

          <Card>
            <Text style={styles.section}>Materiales</Text>
            {resultado.materiales.map((m) => (
              <View key={m.material} style={styles.matBlock}>
                <View
                  style={{ flexDirection: 'row', justifyContent: 'space-between' }}
                >
                  <Text style={styles.matName}>{m.etiqueta}</Text>
                  <Text style={styles.matValue}>
                    {m.unidad === 'kg' || m.unidad === 'sacos' || m.unidad === 'pza'
                      ? `${formatoEntero(m.cantidad)} ${m.unidad}`
                      : `${formatoNumero(m.cantidad, 2)} ${m.unidad}`}
                  </Text>
                </View>
                {m.equivalencias?.map((e, i) => (
                  <Text key={i} style={styles.matEq}>
                    └─ {e.etiqueta}:{' '}
                    {e.unidad === 'pza'
                      ? formatoEntero(e.valor)
                      : formatoNumero(e.valor, 2)}{' '}
                    {e.unidad}
                  </Text>
                ))}
                {m.costoTotal ? (
                  <Text style={styles.matCost}>
                    Costo: {formatoMXN(m.costoTotal)}
                  </Text>
                ) : null}
              </View>
            ))}
          </Card>

          <Card>
            <Text style={styles.section}>Mano de obra</Text>
            {resultado.manoObra.length === 0 ? (
              <Text style={{ color: colors.textMuted }}>
                Configura la tarifa de "Pegado de loseta" en Configuración.
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

          <Button
            title="Compartir resumen"
            onPress={() => {
              const lines = [
                `ObraCalc MX — Pegado de loseta`,
                `Área: ${formatoNumero(resultado.areaNeta, 2)} m²  |  A comprar: ${formatoNumero(resultado.areaConMerma, 2)} m²`,
                formato
                  ? `Formato: ${formato.largoCm}×${formato.anchoCm} cm`
                  : 'Sin formato específico',
                '',
                ...resultado.materiales.flatMap((m) => [
                  `${m.etiqueta}: ${m.unidad === 'kg' || m.unidad === 'sacos' || m.unidad === 'pza' ? formatoEntero(m.cantidad) : formatoNumero(m.cantidad, 2)} ${m.unidad}`,
                  ...(m.equivalencias?.map(
                    (e) => `  ${e.etiqueta}: ${formatoNumero(e.valor, 2)} ${e.unidad}`,
                  ) ?? []),
                ]),
                '',
                ...resultado.manoObra.map(
                  (mo) =>
                    `M.O. ${mo.nombre}: ${formatoNumero(mo.cantidad, 2)} ${mo.unidad} = ${formatoMXN(mo.total)}`,
                ),
                '',
                `Materiales: ${formatoMXN(resultado.costoMateriales)}`,
                `M.O.:       ${formatoMXN(resultado.costoManoObra)}`,
                `TOTAL:      ${formatoMXN(resultado.costoTotal)}`,
              ].join('\n');
              Alert.alert('Resumen', lines);
            }}
          />

          <GuardarEnProyectoButton
            tipo="loseta"
            etiqueta={`Loseta ${formato ? formato.largoCm + '×' + formato.anchoCm : ''} ${formatoNumero(resultado.areaNeta, 1)} m²`}
            inputs={{ modo, area, largo, ancho, formatoId, merma, rendAdh, pesoBoq }}
            resultado={resultado}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    fontSize: 13,
    color: colors.text,
    overflow: 'hidden',
  },
  chipActive: { backgroundColor: colors.primary, color: '#fff', fontWeight: '700' },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 6, fontStyle: 'italic' },
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
