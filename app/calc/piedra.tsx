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
  calcularPiedra,
  type ModoCobroPiedra,
  type TipoElementoPiedra,
} from '@/core/calculators/piedra';
import { useManoObraStore } from '@/store/manoObraStore';
import { usePreciosStore } from '@/store/preciosStore';
import {
  formatoEntero,
  formatoMXN,
  formatoNumero,
  parsearNumero,
} from '@/utils/formato';
import { GuardarEnProyectoButton } from '@/components/GuardarEnProyectoButton';

const TIPOS: { v: TipoElementoPiedra; label: string; desc: string }[] = [
  { v: 'barda',      label: 'Barda',          desc: 'Muro perimetral o decorativo' },
  { v: 'cimiento',   label: 'Cimiento',       desc: 'Cimentación de mampostería' },
  { v: 'muro_carga', label: 'Muro de carga',  desc: 'Muro estructural' },
];

/** Defaults sugeridos según tipo de elemento. */
const DEFAULTS_POR_TIPO: Record<
  TipoElementoPiedra,
  { espesor: string; altura: string; mermaPiedra: string }
> = {
  barda:      { espesor: '0.40', altura: '2.50', mermaPiedra: '10' },
  cimiento:   { espesor: '0.50', altura: '0.80', mermaPiedra: '8' },
  muro_carga: { espesor: '0.50', altura: '2.80', mermaPiedra: '10' },
};

export default function CalcPiedraScreen() {
  const { conceptos } = useManoObraStore();
  const { precios, preferenciaCemento } = usePreciosStore();

  const [tipo, setTipo] = useState<TipoElementoPiedra>('barda');
  const [largo, setLargo] = useState('10');
  const [altura, setAltura] = useState(DEFAULTS_POR_TIPO.barda.altura);
  const [espesor, setEspesor] = useState(DEFAULTS_POR_TIPO.barda.espesor);
  const [dosId, setDosId] = useState<string>('pega_1:1:6');
  const [fraccionPiedra, setFraccionPiedra] = useState('67');
  const [factorEsp, setFactorEsp] = useState('1.10');
  const [mermaPiedra, setMermaPiedra] = useState(
    DEFAULTS_POR_TIPO.barda.mermaPiedra,
  );
  const [mermaMortero, setMermaMortero] = useState('5');
  const [densidadPiedra, setDensidadPiedra] = useState('1500');
  const [modoMO, setModoMO] = useState<ModoCobroPiedra>('m2');
  const [tarifaMOM3, setTarifaMOM3] = useState('800');

  const cambiarTipo = (t: TipoElementoPiedra) => {
    setTipo(t);
    const d = DEFAULTS_POR_TIPO[t];
    setEspesor(d.espesor);
    setAltura(d.altura);
    setMermaPiedra(d.mermaPiedra);
  };

  const resultado = useMemo(() => {
    const L = parsearNumero(largo);
    const H = parsearNumero(altura);
    const E = parsearNumero(espesor);
    if (!isFinite(L) || !isFinite(H) || !isFinite(E)) return null;
    if (L <= 0 || H <= 0 || E <= 0) return null;
    return calcularPiedra({
      tipo,
      largo: L,
      altura: H,
      espesor: E,
      dosificacionId: dosId,
      fraccionPiedra: parsearNumero(fraccionPiedra) / 100,
      factorEsponjamientoPiedra: parsearNumero(factorEsp),
      mermaPiedraPct: parsearNumero(mermaPiedra),
      mermaMorteroPct: parsearNumero(mermaMortero),
      densidadPiedra: parsearNumero(densidadPiedra),
      modoCobroMO: modoMO,
      tarifaMOM3: parsearNumero(tarifaMOM3),
      conceptosMO: conceptos,
      cementoPreferido: preferenciaCemento,

      precios: {
        piedraM3: precios.piedraM3,
        cementoSaco50: precios.cementoSaco50,
        cementoSaco25: precios.cementoSaco25,
        calBulto25: precios.calBulto25,
        arenaM3: precios.arenaM3,
        aguaM3: precios.aguaM3,
      },
    });
  }, [
    tipo,
    largo,
    altura,
    espesor,
    dosId,
    fraccionPiedra,
    factorEsp,
    mermaPiedra,
    mermaMortero,
    densidadPiedra,
    modoMO,
    tarifaMOM3,
    conceptos,
    precios,
  ]);

  const dosOpciones: DosificacionMortero[] = Object.values(DOSIFICACIONES_MORTERO);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>1. Tipo de elemento</Text>
        <View style={styles.chipRow}>
          {TIPOS.map((t) => (
            <Text
              key={t.v}
              onPress={() => cambiarTipo(t.v)}
              style={[styles.chip, tipo === t.v && styles.chipActive]}
            >
              {t.label}
            </Text>
          ))}
        </View>
        <Text style={styles.hint}>
          {TIPOS.find((t) => t.v === tipo)?.desc}
        </Text>
      </Card>

      <Card>
        <Text style={styles.section}>2. Dimensiones del muro</Text>
        <NumberField label="Largo" value={largo} onChange={setLargo} suffix="m" />
        <NumberField label="Altura" value={altura} onChange={setAltura} suffix="m" />
        <NumberField label="Espesor" value={espesor} onChange={setEspesor} suffix="m" />
      </Card>

      <Card>
        <Text style={styles.section}>3. Mortero (dosificación)</Text>
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
        <Text style={styles.hint}>
          Seleccionada: {DOSIFICACIONES_MORTERO[dosId]?.nombre ?? '—'}
        </Text>
      </Card>

      <Card>
        <Text style={styles.section}>4. Ajustes finos (avanzado)</Text>
        <NumberField
          label="% del muro que ocupa la piedra"
          value={fraccionPiedra}
          onChange={setFraccionPiedra}
          suffix="%"
        />
        <NumberField
          label="Factor de esponjamiento de la piedra"
          value={factorEsp}
          onChange={setFactorEsp}
          suffix="×"
        />
        <NumberField
          label="Merma piedra"
          value={mermaPiedra}
          onChange={setMermaPiedra}
          suffix="%"
        />
        <NumberField
          label="Merma mortero"
          value={mermaMortero}
          onChange={setMermaMortero}
          suffix="%"
        />
        <NumberField
          label="Densidad piedra (kg/m³)"
          value={densidadPiedra}
          onChange={setDensidadPiedra}
          suffix="kg/m³"
        />
      </Card>

      <Card>
        <Text style={styles.section}>5. Mano de obra</Text>
        <Label>¿Cómo cobra el albañil?</Label>
        <View style={[styles.chipRow, { marginBottom: 8 }]}>
          <Text
            onPress={() => setModoMO('m2')}
            style={[styles.chip, modoMO === 'm2' && styles.chipActive]}
          >
            Por m² de fachada
          </Text>
          <Text
            onPress={() => setModoMO('m3')}
            style={[styles.chip, modoMO === 'm3' && styles.chipActive]}
          >
            Por m³ de mampostería
          </Text>
        </View>
        {modoMO === 'm2' ? (
          <Text style={styles.hint}>
            Usa la tarifa de "Pegado de piedra" definida en Configuración.
          </Text>
        ) : (
          <NumberField
            label="Tarifa por m³"
            value={tarifaMOM3}
            onChange={setTarifaMOM3}
            suffix="MXN/m³"
          />
        )}
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
              <Pill text={resultado.dosificacion.id.replace('pega_', '')} />
            </View>
            <Row
              left="Volumen del muro"
              right={`${formatoNumero(resultado.volumenMuro, 3)} m³`}
              bold
            />
            <Row
              left="Área de fachada"
              right={`${formatoNumero(resultado.areaFachada, 2)} m²`}
            />
            <Row
              left="Piedra asentada en el muro"
              right={`${formatoNumero(resultado.piedraAsentadaM3, 3)} m³`}
            />
            <Row
              left="Mortero base (sin merma)"
              right={`${formatoNumero(resultado.morteroM3, 3)} m³`}
            />
          </Card>

          <Card>
            <Text style={styles.section}>Materiales a comprar</Text>
            {resultado.materiales.map((m) => (
              <View key={m.material} style={styles.matBlock}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
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
                    {e.unidad === 'sacos' ||
                    e.unidad === 'botes' ||
                    e.unidad === 'bultos'
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
                Configura una tarifa de pegado de piedra o cambia a cobro por m³.
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
            <Row left="TOTAL" right={formatoMXN(resultado.costoTotal)} bold />
          </Card>

          <Button
            title="Compartir resumen"
            onPress={() => {
              const lines = [
                `ObraCalc MX — ${TIPOS.find((x) => x.v === tipo)?.label} de piedra`,
                `Dimensiones: ${largo}×${altura}×${espesor} m`,
                `Volumen muro: ${formatoNumero(resultado.volumenMuro, 3)} m³  |  Fachada: ${formatoNumero(resultado.areaFachada, 2)} m²`,
                `Mortero: ${resultado.dosificacion.nombre}`,
                '',
                ...resultado.materiales.flatMap((m) => [
                  `${m.etiqueta}: ${formatoNumero(m.cantidad, 3)} ${m.unidad}`,
                  ...(m.equivalencias?.map(
                    (e) =>
                      `  ${e.etiqueta}: ${formatoNumero(e.valor, 2)} ${e.unidad}`,
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
            tipo="piedra"
            etiqueta={`${TIPOS.find((x) => x.v === tipo)?.label} de piedra ${largo}×${altura}×${espesor}`}
            inputs={{
              tipo, largo, altura, espesor, dosId, fraccionPiedra, factorEsp,
              mermaPiedra, mermaMortero, densidadPiedra, modoMO, tarifaMOM3,
            }}
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
