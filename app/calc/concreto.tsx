import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, colors, Label, NumberField, Pill, Row } from '@/components/UI';
import {
  DOSIFICACIONES_CONCRETO,
  type DosificacionConcreto,
} from '@/core/constants/dosificaciones';
import { calcularConcreto, type ElementoConcreto } from '@/core/calculators/concreto';
import { useManoObraStore } from '@/store/manoObraStore';
import { usePreciosStore } from '@/store/preciosStore';
import {
  formatoEntero,
  formatoMXN,
  formatoNumero,
  parsearNumero,
} from '@/utils/formato';
import { GuardarEnProyectoButton } from '@/components/GuardarEnProyectoButton';

const ELEMENTOS: { v: ElementoConcreto; label: string }[] = [
  { v: 'losa', label: 'Losa' },
  { v: 'firme', label: 'Firme' },
  { v: 'zapata', label: 'Zapata' },
  { v: 'plantilla', label: 'Plantilla' },
  { v: 'castillo', label: 'Castillo' },
  { v: 'trabe', label: 'Trabe' },
  { v: 'columna', label: 'Columna' },
  { v: 'cadena', label: 'Cadena' },
  { v: 'generico', label: 'Otro' },
];

export default function CalcConcretoScreen() {
  const { conceptos } = useManoObraStore();
  const { precios, preferenciaCemento } = usePreciosStore();

  const [elemento, setElemento] = useState<ElementoConcreto>('losa');
  const [largo, setLargo] = useState('8.5');
  const [ancho, setAncho] = useState('6');
  const [espesor, setEspesor] = useState('0.12');
  const [dosId, setDosId] = useState<string>('f200_1:2:2.5');
  const [merma, setMerma] = useState('5');

  const resultado = useMemo(() => {
    const L = parsearNumero(largo);
    const A = parsearNumero(ancho);
    const E = parsearNumero(espesor);
    const M = parsearNumero(merma);
    if (!isFinite(L) || !isFinite(A) || !isFinite(E)) return null;
    if (L <= 0 || A <= 0 || E <= 0) return null;
    return calcularConcreto({
      elemento,
      largo: L,
      ancho: A,
      espesor: E,
      dosificacionId: dosId,
      mermaPct: isFinite(M) ? M : 5,
      conceptosMO: conceptos,
      cementoPreferido: preferenciaCemento,

      precios: {
        cementoSaco50: precios.cementoSaco50,
        cementoSaco25: precios.cementoSaco25,
        arenaM3: precios.arenaM3,
        gravaM3: precios.gravaM3,
        agua_m3: precios.aguaM3,
      },
    });
  }, [elemento, largo, ancho, espesor, dosId, merma, conceptos, precios]);

  const dosOpciones: DosificacionConcreto[] = Object.values(DOSIFICACIONES_CONCRETO);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>1. Tipo de elemento</Text>
        <View style={styles.chipRow}>
          {ELEMENTOS.map((e) => (
            <Text
              key={e.v}
              onPress={() => setElemento(e.v)}
              style={[styles.chip, elemento === e.v && styles.chipActive]}
            >
              {e.label}
            </Text>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>2. Dimensiones</Text>
        <NumberField label="Largo" value={largo} onChange={setLargo} suffix="m" />
        <NumberField label="Ancho" value={ancho} onChange={setAncho} suffix="m" />
        <NumberField
          label="Espesor / peralte"
          value={espesor}
          onChange={setEspesor}
          suffix="m"
        />
        <NumberField label="Merma" value={merma} onChange={setMerma} suffix="%" />
      </Card>

      <Card>
        <Text style={styles.section}>3. Dosificación</Text>
        <View style={styles.chipRow}>
          {dosOpciones.map((d) => (
            <Text
              key={d.id}
              onPress={() => setDosId(d.id)}
              style={[styles.chip, dosId === d.id && styles.chipActive]}
            >
              {d.nombre}
            </Text>
          ))}
        </View>
      </Card>

      {resultado ? (
        <>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={styles.section}>Resultado</Text>
              <Pill text={resultado.dosificacion.id} />
            </View>
            <Row left="Volumen final"
              right={`${formatoNumero(resultado.volumenConMerma, 3)} m³`}
              bold
            />
            <Row left="Volumen en botes 19 L"
              right={`${formatoEntero(resultado.volumenConMerma / 0.019)} botes`}
            />
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
                    {e.unidad === 'sacos' || e.unidad === 'botes'
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
                Este elemento no tiene mano de obra asignada por defecto.
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
            <Row
              left="Costo materiales"
              right={formatoMXN(resultado.costoMateriales)}
            />
            <Row
              left="Costo mano de obra"
              right={formatoMXN(resultado.costoManoObra)}
            />
            <Row
              left="TOTAL"
              right={formatoMXN(resultado.costoTotal)}
              bold
            />
          </Card>

          <Button
            title="Compartir resumen"
            onPress={() => {
              const lines = [
                `ObraCalc MX — ${ELEMENTOS.find((x) => x.v === elemento)?.label}`,
                `Dimensiones: ${largo}×${ancho}×${espesor} m  Merma: ${merma}%`,
                `Dosificación: ${resultado.dosificacion.nombre}`,
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
            tipo="concreto"
            etiqueta={`Concreto ${ELEMENTOS.find((x) => x.v === elemento)?.label} ${largo}×${ancho}×${espesor}`}
            inputs={{ elemento, largo, ancho, espesor, dosId, merma }}
            resultado={resultado}
          />
        </>
      ) : (
        <Card>
          <Text style={{ color: colors.textMuted }}>
            Captura las dimensiones para ver el resultado.
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
