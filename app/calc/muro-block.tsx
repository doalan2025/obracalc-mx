import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
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
  calcularMuroBlock,
  PIEZAS_MURO,
  type TipoPiezaMuro,
  type Vano,
} from '@/core/calculators/muroBlock';
import { useManoObraStore } from '@/store/manoObraStore';
import { usePreciosStore } from '@/store/preciosStore';
import {
  formatoEntero,
  formatoMXN,
  formatoNumero,
  parsearNumero,
} from '@/utils/formato';
import { GuardarEnProyectoButton } from '@/components/GuardarEnProyectoButton';

const TIPOS: TipoPiezaMuro[] = [
  'block_12',
  'block_15',
  'block_20',
  'tabique_rojo',
];

export default function CalcMuroBlockScreen() {
  const { conceptos } = useManoObraStore();
  const { precios } = usePreciosStore();

  const [tipoPieza, setTipoPieza] = useState<TipoPiezaMuro>('block_15');
  const [largo, setLargo] = useState('6');
  const [altura, setAltura] = useState('2.5');
  const [dosId, setDosId] = useState<string>('pega_1:4');
  const [mermaPiezas, setMermaPiezas] = useState('5');
  const [mermaMortero, setMermaMortero] = useState('5');

  // Vanos
  const [vanos, setVanos] = useState<Vano[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState('Ventana');
  const [nuevoAncho, setNuevoAncho] = useState('1.20');
  const [nuevoAlto, setNuevoAlto] = useState('1.00');

  const agregarVano = () => {
    const a = parsearNumero(nuevoAncho);
    const h = parsearNumero(nuevoAlto);
    if (!isFinite(a) || !isFinite(h) || a <= 0 || h <= 0) return;
    setVanos((v) => [
      ...v,
      { nombre: nuevoNombre.trim() || 'Vano', ancho: a, alto: h },
    ]);
  };

  const piezaInfo = PIEZAS_MURO[tipoPieza];
  const precioPieza = precios[piezaInfo.precioKey];

  const resultado = useMemo(() => {
    const L = parsearNumero(largo);
    const H = parsearNumero(altura);
    if (!isFinite(L) || !isFinite(H) || L <= 0 || H <= 0) return null;
    return calcularMuroBlock({
      tipoPieza,
      largo: L,
      altura: H,
      vanos,
      dosificacionId: dosId,
      mermaPiezasPct: parsearNumero(mermaPiezas),
      mermaMorteroPct: parsearNumero(mermaMortero),
      conceptosMO: conceptos,
      precios: {
        piezaPrecio: precioPieza,
        cementoSaco50: precios.cementoSaco50,
        cementoSaco25: precios.cementoSaco25,
        calBulto25: precios.calBulto25,
        arenaM3: precios.arenaM3,
        aguaM3: precios.aguaM3,
      },
    });
  }, [
    tipoPieza,
    largo,
    altura,
    vanos,
    dosId,
    mermaPiezas,
    mermaMortero,
    conceptos,
    precios,
    precioPieza,
  ]);

  const dosOpciones: DosificacionMortero[] = Object.values(DOSIFICACIONES_MORTERO);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>1. Tipo de pieza</Text>
        <View style={styles.chipRow}>
          {TIPOS.map((t) => (
            <Text
              key={t}
              onPress={() => setTipoPieza(t)}
              style={[styles.chip, tipoPieza === t && styles.chipActive]}
            >
              {PIEZAS_MURO[t].nombre.replace('Block hueco', 'Block').replace(' recocido 6×12×24', '')}
            </Text>
          ))}
        </View>
        <Text style={styles.hint}>
          {piezaInfo.piezasM2} pza/m² · {piezaInfo.morteroM2} m³ mortero/m² ·{' '}
          Precio: {formatoMXN(precioPieza)}/pza
        </Text>
      </Card>

      <Card>
        <Text style={styles.section}>2. Dimensiones</Text>
        <NumberField label="Largo" value={largo} onChange={setLargo} suffix="m" />
        <NumberField label="Altura" value={altura} onChange={setAltura} suffix="m" />
      </Card>

      <Card>
        <Text style={styles.section}>3. Vanos a descontar</Text>
        {vanos.length === 0 ? (
          <Text style={styles.hint}>Sin vanos. Puedes agregar abajo.</Text>
        ) : (
          vanos.map((v, i) => (
            <View key={i} style={styles.vanoRow}>
              <Text style={{ flex: 1 }}>
                {v.nombre}: {v.ancho} × {v.alto} m ={' '}
                {formatoNumero(v.ancho * v.alto, 2)} m²
              </Text>
              <Trash2
                color={colors.danger}
                size={18}
                onPress={() => setVanos((vs) => vs.filter((_, j) => j !== i))}
              />
            </View>
          ))
        )}
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <NumberField
                label="Ancho"
                value={nuevoAncho}
                onChange={setNuevoAncho}
                suffix="m"
              />
            </View>
            <View style={{ flex: 1 }}>
              <NumberField
                label="Alto"
                value={nuevoAlto}
                onChange={setNuevoAlto}
                suffix="m"
              />
            </View>
          </View>
          <Button title="+ Agregar vano" onPress={agregarVano} variant="secondary" />
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>4. Dosificación de mortero</Text>
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
        <Text style={styles.section}>5. Mermas</Text>
        <NumberField
          label="Merma de piezas"
          value={mermaPiezas}
          onChange={setMermaPiezas}
          suffix="%"
        />
        <NumberField
          label="Merma de mortero"
          value={mermaMortero}
          onChange={setMermaMortero}
          suffix="%"
        />
      </Card>

      {resultado ? (
        <>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={styles.section}>Resumen</Text>
              <Pill text={resultado.dosificacion.id.replace('pega_', '')} />
            </View>
            <Row left="Área bruta" right={`${formatoNumero(resultado.areaBruta, 2)} m²`} />
            {resultado.areaVanos > 0 ? (
              <Row left="Vanos" right={`-${formatoNumero(resultado.areaVanos, 2)} m²`} />
            ) : null}
            <Row left="Área neta" right={`${formatoNumero(resultado.areaNeta, 2)} m²`} bold />
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
                        : m.unidad === 'pza'
                          ? `${formatoEntero(m.cantidad)} pza`
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
                  <Text style={styles.matCost}>Costo: {formatoMXN(m.costoTotal)}</Text>
                ) : null}
              </View>
            ))}
          </Card>

          <Card>
            <Text style={styles.section}>Mano de obra</Text>
            {resultado.manoObra.length === 0 ? (
              <Text style={{ color: colors.textMuted }}>
                Configura una tarifa de pegado en la pestaña Configuración.
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
                `ObraCalc MX — Muro de ${piezaInfo.nombre}`,
                `Dimensiones: ${largo} × ${altura} m`,
                `Área neta: ${formatoNumero(resultado.areaNeta, 2)} m² (vanos: ${formatoNumero(resultado.areaVanos, 2)} m²)`,
                `Mortero: ${resultado.dosificacion.nombre}`,
                '',
                ...resultado.materiales.flatMap((m) => [
                  `${m.etiqueta}: ${m.unidad === 'pza' ? formatoEntero(m.cantidad) : formatoNumero(m.cantidad, 3)} ${m.unidad}`,
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
            tipo="muro-block"
            etiqueta={`${piezaInfo.nombre} ${largo}×${altura}`}
            inputs={{ tipoPieza, largo, altura, vanos, dosId, mermaPiezas, mermaMortero }}
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
  vanoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
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
