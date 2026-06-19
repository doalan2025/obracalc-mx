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
  calcularMuroBlock,
  PIEZAS_MURO,
  RECETAS_PEGA_BLOCK,
  type RecetaPegaBlock,
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

const RECETA_IDS: RecetaPegaBlock[] = [
  'cal_5botes',
  'cal_25kg',
  'mortero_premezclado',
];

export default function CalcMuroBlockScreen() {
  const { conceptos } = useManoObraStore();
  const { precios, preferenciaCemento } = usePreciosStore();

  const [tipoPieza, setTipoPieza] = useState<TipoPiezaMuro>('block_15');
  const [largo, setLargo] = useState('6');
  const [altura, setAltura] = useState('2.5');
  const [recetaId, setRecetaId] = useState<RecetaPegaBlock>('cal_5botes');
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
  const recetaInfo = RECETAS_PEGA_BLOCK[recetaId];

  const resultado = useMemo(() => {
    const L = parsearNumero(largo);
    const H = parsearNumero(altura);
    if (!isFinite(L) || !isFinite(H) || L <= 0 || H <= 0) return null;
    return calcularMuroBlock({
      tipoPieza,
      largo: L,
      altura: H,
      vanos,
      recetaId,
      mermaPiezasPct: parsearNumero(mermaPiezas),
      mermaMorteroPct: parsearNumero(mermaMortero),
      conceptosMO: conceptos,
      cementoPreferido: preferenciaCemento,

      precios: {
        piezaPrecio: precioPieza,
        cementoSaco50: precios.cementoSaco50,
        cementoSaco25: precios.cementoSaco25,
        calBulto25: precios.calBulto25,
        morteroBulto50: precios.cementoSaco50, // aproximado, mortero suele tener precio similar
        arenaM3: precios.arenaM3,
        aguaM3: precios.aguaM3,
      },
    });
  }, [
    tipoPieza,
    largo,
    altura,
    vanos,
    recetaId,
    mermaPiezas,
    mermaMortero,
    conceptos,
    precios,
    precioPieza,
  ]);

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
              {PIEZAS_MURO[t].nombre.replace('Block hueco ', '').replace(' recocido 6×12×24', ' rojo')}
            </Text>
          ))}
        </View>
        <Text style={styles.hint}>
          {piezaInfo.piezasM2} pza/m² · Precio: {formatoMXN(precioPieza)}/pza
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
        <Text style={styles.section}>4. Mezcla pega-block</Text>
        <View style={styles.chipRow}>
          {RECETA_IDS.map((id) => (
            <Text
              key={id}
              onPress={() => setRecetaId(id)}
              style={[styles.chip, recetaId === id && styles.chipActive]}
            >
              {RECETAS_PEGA_BLOCK[id].nombre.split('(')[0].trim()}
            </Text>
          ))}
        </View>
        <Text style={styles.hint}>{recetaInfo.descripcion}</Text>
        <Text style={styles.hint}>
          Rendimiento: ~{(recetaInfo.rinde_m3 * 1000).toFixed(0)} L por bacha
        </Text>
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
              <Pill text={resultado.receta.id.replace('_', '·')} />
            </View>
            <Row left="Área bruta" right={`${formatoNumero(resultado.areaBruta, 2)} m²`} />
            {resultado.areaVanos > 0 ? (
              <Row left="Vanos" right={`-${formatoNumero(resultado.areaVanos, 2)} m²`} />
            ) : null}
            <Row left="Área neta" right={`${formatoNumero(resultado.areaNeta, 2)} m²`} bold />
            <Row left="Bachas a preparar" right={`${resultado.bachasNecesarias}`} bold />
          </Card>

          <Card>
            <Text style={styles.section}>Materiales a comprar</Text>
            {resultado.materiales.map((m) => (
              <View key={m.material} style={styles.matBlock}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.matName}>{m.etiqueta}</Text>
                  <Text style={styles.matValue}>
                    {m.unidad === 'pza' || m.unidad === 'sacos' ||
                     m.unidad === 'bultos' || m.unidad === 'botes' || m.unidad === 'kg'
                      ? `${formatoEntero(m.cantidad)} ${m.unidad}`
                      : `${formatoNumero(m.cantidad, 2)} ${m.unidad}`}
                  </Text>
                </View>
                {m.equivalencias?.map((e, i) => (
                  <Text key={i} style={styles.matEq}>
                    └─ {e.etiqueta}:{' '}
                    {e.unidad === 'sacos' || e.unidad === 'botes' ||
                     e.unidad === 'bultos' || e.unidad === 'pza'
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
                `Receta: ${resultado.receta.nombre}`,
                `Bachas: ${resultado.bachasNecesarias}`,
                '',
                ...resultado.materiales.map((m) =>
                  `${m.etiqueta}: ${m.unidad === 'pza' || m.unidad === 'sacos' || m.unidad === 'bultos' || m.unidad === 'botes' ? formatoEntero(m.cantidad) : formatoNumero(m.cantidad, 2)} ${m.unidad}`,
                ),
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
            inputs={{ tipoPieza, largo, altura, vanos, recetaId, mermaPiezas, mermaMortero }}
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
