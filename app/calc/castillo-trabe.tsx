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
  CALIBRES_VARILLA,
  type CalibreVarilla,
} from '@/core/constants/acero';
import {
  DOSIFICACIONES_CONCRETO,
  type DosificacionConcreto,
} from '@/core/constants/dosificaciones';
import {
  calcularCastilloTrabe,
  type TipoElementoLineal,
} from '@/core/calculators/castilloTrabe';
import { useManoObraStore } from '@/store/manoObraStore';
import { usePreciosStore } from '@/store/preciosStore';
import {
  formatoEntero,
  formatoMXN,
  formatoNumero,
  parsearNumero,
} from '@/utils/formato';
import { GuardarEnProyectoButton } from '@/components/GuardarEnProyectoButton';

const CALIBRES_LIST = Object.keys(CALIBRES_VARILLA) as CalibreVarilla[];

const TIPOS: { v: TipoElementoLineal; label: string; desc: string }[] = [
  { v: 'castillo', label: 'Castillo', desc: 'Elemento vertical en muros (ml)' },
  { v: 'trabe',    label: 'Trabe',    desc: 'Viga horizontal (ml)' },
  { v: 'cadena',   label: 'Cadena',   desc: 'Cerramiento horizontal (ml)' },
  { v: 'columna',  label: 'Columna',  desc: 'Elemento vertical aislado (pza)' },
];

const DEFAULTS_POR_TIPO: Record<
  TipoElementoLineal,
  {
    baseCm: string;
    peraltCm: string;
    calibreLong: CalibreVarilla;
    numLong: string;
    sepEstrCm: string;
    dosId: string;
  }
> = {
  castillo: {
    baseCm: '15', peraltCm: '15', calibreLong: '#3', numLong: '4',
    sepEstrCm: '15', dosId: 'f200_1:2:2.5',
  },
  trabe: {
    baseCm: '20', peraltCm: '30', calibreLong: '#4', numLong: '4',
    sepEstrCm: '20', dosId: 'f250_1:2:2',
  },
  cadena: {
    baseCm: '15', peraltCm: '15', calibreLong: '#3', numLong: '4',
    sepEstrCm: '20', dosId: 'f200_1:2:2.5',
  },
  columna: {
    baseCm: '25', peraltCm: '25', calibreLong: '#4', numLong: '4',
    sepEstrCm: '15', dosId: 'f250_1:2:2',
  },
};

export default function CalcCastilloTrabeScreen() {
  const { conceptos } = useManoObraStore();
  const { precios } = usePreciosStore();

  const [tipo, setTipo] = useState<TipoElementoLineal>('castillo');
  const def = DEFAULTS_POR_TIPO.castillo;

  const [longitud, setLongitud] = useState('2.5');
  const [piezas, setPiezas] = useState('4');
  const [baseCm, setBaseCm] = useState(def.baseCm);
  const [peraltCm, setPeraltCm] = useState(def.peraltCm);
  const [calibreLong, setCalibreLong] = useState<CalibreVarilla>(def.calibreLong);
  const [numLong, setNumLong] = useState(def.numLong);
  const [calibreEstr, setCalibreEstr] = useState<CalibreVarilla>('#2');
  const [sepEstrCm, setSepEstrCm] = useState(def.sepEstrCm);
  const [recubrimientoCm, setRecubrimientoCm] = useState('2.5');
  const [ganchoCm, setGanchoCm] = useState('10');
  const [traslapesPct, setTraslapesPct] = useState('10');
  const [dosId, setDosId] = useState<string>(def.dosId);
  const [mermaConcreto, setMermaConcreto] = useState('5');

  const cambiarTipo = (t: TipoElementoLineal) => {
    setTipo(t);
    const d = DEFAULTS_POR_TIPO[t];
    setBaseCm(d.baseCm);
    setPeraltCm(d.peraltCm);
    setCalibreLong(d.calibreLong);
    setNumLong(d.numLong);
    setSepEstrCm(d.sepEstrCm);
    setDosId(d.dosId);
  };

  const resultado = useMemo(() => {
    const L = parsearNumero(longitud);
    const P = parsearNumero(piezas);
    const B = parsearNumero(baseCm);
    const H = parsearNumero(peraltCm);
    if (!isFinite(L) || !isFinite(P) || L <= 0 || P <= 0) return null;
    if (!isFinite(B) || !isFinite(H) || B <= 0 || H <= 0) return null;
    return calcularCastilloTrabe({
      tipo,
      longitudPorPieza: L,
      cantidadPiezas: P,
      baseCm: B,
      peraltCm: H,
      calibreLong,
      numVarillasLong: parsearNumero(numLong),
      calibreEstribo: calibreEstr,
      separacionEstriboCm: parsearNumero(sepEstrCm),
      recubrimientoCm: parsearNumero(recubrimientoCm),
      ganchoEstriboCm: parsearNumero(ganchoCm),
      traslapesAceroPct: parsearNumero(traslapesPct),
      dosificacionId: dosId,
      mermaConcretoPct: parsearNumero(mermaConcreto),
      conceptosMO: conceptos,
      precios: {
        cementoSaco50: precios.cementoSaco50,
        cementoSaco25: precios.cementoSaco25,
        arenaM3: precios.arenaM3,
        gravaM3: precios.gravaM3,
        aguaM3: precios.aguaM3,
        aceroKg: precios.aceroKg,
        alambreKg: precios.alambreKg,
      },
    });
  }, [
    tipo, longitud, piezas, baseCm, peraltCm, calibreLong, numLong,
    calibreEstr, sepEstrCm, recubrimientoCm, ganchoCm, traslapesPct,
    dosId, mermaConcreto, conceptos, precios,
  ]);

  const dosOpciones: DosificacionConcreto[] = Object.values(DOSIFICACIONES_CONCRETO);

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
        <Text style={styles.hint}>{TIPOS.find((t) => t.v === tipo)?.desc}</Text>
      </Card>

      <Card>
        <Text style={styles.section}>2. Geometría</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <NumberField
              label={tipo === 'columna' ? 'Altura por pieza' : 'Longitud por pieza'}
              value={longitud}
              onChange={setLongitud}
              suffix="m"
            />
          </View>
          <View style={{ flex: 1 }}>
            <NumberField
              label="Cantidad de piezas"
              value={piezas}
              onChange={setPiezas}
              suffix="pza"
            />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <NumberField label="Base" value={baseCm} onChange={setBaseCm} suffix="cm" />
          </View>
          <View style={{ flex: 1 }}>
            <NumberField label="Peralte" value={peraltCm} onChange={setPeraltCm} suffix="cm" />
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>3. Acero longitudinal</Text>
        <Label>Calibre</Label>
        <View style={styles.chipRow}>
          {CALIBRES_LIST.map((c) => (
            <Text
              key={c}
              onPress={() => setCalibreLong(c)}
              style={[styles.chip, calibreLong === c && styles.chipActive]}
            >
              {c}
            </Text>
          ))}
        </View>
        <NumberField
          label="Número de varillas"
          value={numLong}
          onChange={setNumLong}
          suffix="pza"
        />
        <NumberField
          label="Traslapes / desperdicio"
          value={traslapesPct}
          onChange={setTraslapesPct}
          suffix="%"
        />
      </Card>

      <Card>
        <Text style={styles.section}>4. Estribos</Text>
        <Label>Calibre estribo</Label>
        <View style={styles.chipRow}>
          {CALIBRES_LIST.slice(0, 5).map((c) => (
            <Text
              key={c}
              onPress={() => setCalibreEstr(c)}
              style={[styles.chip, calibreEstr === c && styles.chipActive]}
            >
              {c}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <NumberField
              label="Separación"
              value={sepEstrCm}
              onChange={setSepEstrCm}
              suffix="cm"
            />
          </View>
          <View style={{ flex: 1 }}>
            <NumberField
              label="Recubrimiento"
              value={recubrimientoCm}
              onChange={setRecubrimientoCm}
              suffix="cm"
            />
          </View>
        </View>
        <NumberField
          label="Gancho por extremo"
          value={ganchoCm}
          onChange={setGanchoCm}
          suffix="cm"
        />
      </Card>

      <Card>
        <Text style={styles.section}>5. Concreto</Text>
        <View style={styles.chipRow}>
          {dosOpciones.map((d) => (
            <Text
              key={d.id}
              onPress={() => setDosId(d.id)}
              style={[styles.chip, dosId === d.id && styles.chipActive]}
            >
              {d.nombre.split('—')[0].trim()}
            </Text>
          ))}
        </View>
        <NumberField
          label="Merma concreto"
          value={mermaConcreto}
          onChange={setMermaConcreto}
          suffix="%"
        />
      </Card>

      {resultado ? (
        <>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={styles.section}>Resumen</Text>
              <Pill text={resultado.dosificacion.id.split('_')[0]} />
            </View>
            <Row left="Sección" right={`${baseCm}×${peraltCm} cm`} />
            <Row
              left="Total"
              right={`${piezas} pza × ${longitud} m`}
            />
            <Row
              left="Concreto"
              right={`${formatoNumero(resultado.volumenConcretoM3, 3)} m³`}
              bold
            />
            <Row
              left={`Acero ${resultado.detalleLongitudinal.calibre} (long)`}
              right={`${formatoNumero(resultado.detalleLongitudinal.pesoKg, 2)} kg / ${resultado.detalleLongitudinal.varillasComerciales} var de 12 m`}
            />
            <Row
              left={`Estribos ${resultado.detalleEstribos.calibre}`}
              right={`${formatoNumero(resultado.detalleEstribos.pesoKg, 2)} kg / ${resultado.detalleEstribos.cantidadPorPieza} por pieza`}
            />
            <Row
              left="Long. cada estribo"
              right={`${formatoNumero(resultado.detalleEstribos.longitudPorEstriboCm, 1)} cm`}
            />
          </Card>

          <Card>
            <Text style={styles.section}>Materiales detallados</Text>
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
                    {e.unidad === 'sacos' ||
                    e.unidad === 'botes' ||
                    e.unidad === 'pza'
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
                Configura la tarifa correspondiente en Configuración.
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
                `ObraCalc MX — ${TIPOS.find((x) => x.v === tipo)?.label}`,
                `Sección: ${baseCm}×${peraltCm} cm  |  Piezas: ${piezas} × ${longitud} m`,
                `Concreto: ${resultado.dosificacion.nombre}`,
                `Long: ${numLong}#${calibreLong.replace('#', '')}  |  Estribos: ${calibreEstr} @ ${sepEstrCm} cm`,
                '',
                ...resultado.materiales.flatMap((m) => [
                  `${m.etiqueta}: ${m.unidad === 'kg' ? formatoEntero(m.cantidad) : formatoNumero(m.cantidad, 3)} ${m.unidad}`,
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
            tipo="castillo-trabe"
            etiqueta={`${TIPOS.find((x) => x.v === tipo)?.label} ${baseCm}×${peraltCm} (${piezas} pza)`}
            inputs={{
              tipo, longitud, piezas, baseCm, peraltCm, calibreLong, numLong,
              calibreEstr, sepEstrCm, recubrimientoCm, ganchoCm, traslapesPct,
              dosId, mermaConcreto,
            }}
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
