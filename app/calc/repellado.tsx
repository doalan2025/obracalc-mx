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
  DOSIFICACIONES_MORTERO,
  type DosificacionMortero,
} from '@/core/constants/dosificaciones';
import {
  calcularRepellado,
  type ModoEntradaRepellado,
} from '@/core/calculators/repellado';
import { useManoObraStore } from '@/store/manoObraStore';
import { usePreciosStore } from '@/store/preciosStore';
import {
  formatoEntero,
  formatoMXN,
  formatoNumero,
  parsearNumero,
} from '@/utils/formato';
import { GuardarEnProyectoButton } from '@/components/GuardarEnProyectoButton';

export default function CalcRepelladoScreen() {
  const { conceptos } = useManoObraStore();
  const { precios, preferenciaCemento } = usePreciosStore();

  const [modo, setModo] = useState<ModoEntradaRepellado>('area');
  const [area, setArea] = useState('20');
  const [largo, setLargo] = useState('5');
  const [alto, setAlto] = useState('2.5');
  const [caras, setCaras] = useState<1 | 2>(1);
  const [espesorCm, setEspesorCm] = useState('1.5');
  const [dosId, setDosId] = useState<string>('repellado_1:5');
  const [merma, setMerma] = useState('12');

  const resultado = useMemo(() => {
    const E = parsearNumero(espesorCm) / 100;
    if (!isFinite(E) || E <= 0) return null;
    return calcularRepellado({
      modo,
      area: parsearNumero(area),
      largo: parsearNumero(largo),
      alto: parsearNumero(alto),
      caras,
      espesor: E,
      dosificacionId: dosId,
      mermaPct: parsearNumero(merma),
      conceptosMO: conceptos,
      cementoPreferido: preferenciaCemento,

      precios: {
        cementoSaco50: precios.cementoSaco50,
        cementoSaco25: precios.cementoSaco25,
        calBulto25: precios.calBulto25,
        arenaM3: precios.arenaM3,
        aguaM3: precios.aguaM3,
      },
    });
  }, [modo, area, largo, alto, caras, espesorCm, dosId, merma, conceptos, precios]);

  const dosOpciones: DosificacionMortero[] = Object.values(DOSIFICACIONES_MORTERO).filter(
    (d) => d.uso === 'repellado' || d.uso === 'pega' || d.uso === 'general',
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>1. Superficie a aplanar</Text>
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
            Largo × alto
          </Text>
        </View>
        {modo === 'area' ? (
          <NumberField label="Área" value={area} onChange={setArea} suffix="m²" />
        ) : (
          <>
            <NumberField label="Largo" value={largo} onChange={setLargo} suffix="m" />
            <NumberField label="Alto" value={alto} onChange={setAlto} suffix="m" />
          </>
        )}

        <Label>Caras a aplanar</Label>
        <View style={styles.chipRow}>
          <Text
            onPress={() => setCaras(1)}
            style={[styles.chip, caras === 1 && styles.chipActive]}
          >
            1 cara
          </Text>
          <Text
            onPress={() => setCaras(2)}
            style={[styles.chip, caras === 2 && styles.chipActive]}
          >
            2 caras (interior + exterior)
          </Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>2. Espesor del aplanado</Text>
        <NumberField
          label="Espesor"
          value={espesorCm}
          onChange={setEspesorCm}
          suffix="cm"
        />
        <Text style={styles.hint}>
          Típico: 1.5 cm interior · 2.0 cm exterior · 2.5 cm en muros muy
          irregulares.
        </Text>
      </Card>

      <Card>
        <Text style={styles.section}>3. Dosificación de mortero</Text>
        <View style={styles.chipRow}>
          {dosOpciones.map((d) => (
            <Text
              key={d.id}
              onPress={() => setDosId(d.id)}
              style={[styles.chip, dosId === d.id && styles.chipActive]}
            >
              {d.nombre.split('(')[0].trim()}
            </Text>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>4. Merma</Text>
        <NumberField
          label="Merma de mortero"
          value={merma}
          onChange={setMerma}
          suffix="%"
        />
        <Text style={styles.hint}>
          En aplanado la merma típica es de 10–15 % por el material que cae al
          aplicar.
        </Text>
      </Card>

      {resultado ? (
        <>
          <Card>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Text style={styles.section}>Resumen</Text>
              <Pill text={resultado.dosificacion.id.replace('repellado_', '').replace('pega_', '')} />
            </View>
            <Row left="Área por cara" right={`${formatoNumero(resultado.areaCara, 2)} m²`} />
            <Row left="Caras" right={`${caras}`} />
            <Row left="Área total" right={`${formatoNumero(resultado.areaTotal, 2)} m²`} bold />
            <Row left="Espesor" right={`${espesorCm} cm`} />
            <Row left="Mortero" right={`${formatoNumero(resultado.morteroM3, 3)} m³`} bold />
          </Card>

          <Card>
            <Text style={styles.section}>Materiales</Text>
            {resultado.materiales.map((m) => (
              <View key={m.material} style={styles.matBlock}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.matName}>{m.etiqueta}</Text>
                  <Text style={styles.matValue}>
                    {m.unidad === 'kg'
                      ? `${formatoEntero(m.cantidad)} ${m.unidad}`
                      : m.unidad === 'L'
                        ? `${formatoEntero(m.cantidad)} L`
                        : `${formatoNumero(m.cantidad, 3)} ${m.unidad}`}
                  </Text>
                </View>
                {m.equivalencias?.map((e, i) => (
                  <Text key={i} style={styles.matEq}>
                    └─ {e.etiqueta}:{' '}
                    {e.unidad === 'sacos' || e.unidad === 'botes' || e.unidad === 'bultos'
                      ? formatoEntero(e.valor)
                      : formatoNumero(e.valor, 2)}{' '}
                    {e.unidad}
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
                Configura la tarifa de "Repellado / aplanado" en Configuración.
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
                `ObraCalc MX — Repellado / Aplanado`,
                `Área total: ${formatoNumero(resultado.areaTotal, 2)} m² (${caras} cara${caras > 1 ? 's' : ''})`,
                `Espesor: ${espesorCm} cm  |  Mortero: ${resultado.dosificacion.nombre}`,
                '',
                ...resultado.materiales.flatMap((m) => [
                  `${m.etiqueta}: ${formatoNumero(m.cantidad, 3)} ${m.unidad}`,
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
            tipo="repellado"
            etiqueta={`Repellado ${formatoNumero(resultado.areaTotal, 1)} m² (${caras} cara${caras > 1 ? 's' : ''})`}
            inputs={{ modo, area, largo, alto, caras, espesorCm, dosId, merma }}
            resultado={resultado}
          />
        </>
      ) : (
        <Card>
          <Text style={{ color: colors.textMuted }}>
            Captura los datos para ver el resultado.
          </Text>
        </Card>
      )}
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
