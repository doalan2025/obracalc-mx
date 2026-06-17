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
import { MALLAS } from '@/core/constants/malla';
import { calcularLosaAligerada } from '@/core/calculators/losaAligerada';
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
const MALLA_IDS = Object.keys(MALLAS);

export default function CalcLosaAligeradaScreen() {
  const { conceptos } = useManoObraStore();
  const { precios } = usePreciosStore();

  const [largo, setLargo] = useState('5');
  const [ancho, setAncho] = useState('4');
  const [espesorTotal, setEspesorTotal] = useState('25');
  const [largoCas, setLargoCas] = useState('60');
  const [anchoCas, setAnchoCas] = useState('20');
  const [peralteCas, setPeralteCas] = useState('20');
  const [anchoNerv, setAnchoNerv] = useState('10');
  const [calibreLong, setCalibreLong] = useState<CalibreVarilla>('#4');
  const [varPorNerv, setVarPorNerv] = useState('2');
  const [calibreEstr, setCalibreEstr] = useState<CalibreVarilla>('#2');
  const [sepEstr, setSepEstr] = useState('25');
  const [mallaId, setMallaId] = useState('6x6-10x10');
  const [dosId, setDosId] = useState('f250_1:2:2');

  const resultado = useMemo(() => {
    const L = parsearNumero(largo);
    const A = parsearNumero(ancho);
    if (!isFinite(L) || !isFinite(A) || L <= 0 || A <= 0) return null;
    return calcularLosaAligerada({
      largo: L,
      ancho: A,
      espesorTotalM: parsearNumero(espesorTotal) / 100,
      largoCasetonCm: parsearNumero(largoCas),
      anchoCasetonCm: parsearNumero(anchoCas),
      peralteCasetonCm: parsearNumero(peralteCas),
      anchoNervaduraCm: parsearNumero(anchoNerv),
      calibreLong,
      varillasPorNervadura: parsearNumero(varPorNerv),
      calibreEstribo: calibreEstr,
      separacionEstriboCm: parsearNumero(sepEstr),
      mallaId,
      dosificacionId: dosId,
      conceptosMO: conceptos,
      precios: {
        cementoSaco50: precios.cementoSaco50,
        arenaM3: precios.arenaM3,
        gravaM3: precios.gravaM3,
        aguaM3: precios.aguaM3,
        aceroKg: precios.aceroKg,
        alambreKg: precios.alambreKg,
        casetonPza: precios.casetonPza,
        mallaM2: precios.mallaM2,
      },
    });
  }, [
    largo, ancho, espesorTotal, largoCas, anchoCas, peralteCas, anchoNerv,
    calibreLong, varPorNerv, calibreEstr, sepEstr, mallaId, dosId,
    conceptos, precios,
  ]);

  const dosOpciones: DosificacionConcreto[] = Object.values(DOSIFICACIONES_CONCRETO);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>1. Geometría de la losa</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <NumberField label="Largo (sentido nervaduras)" value={largo} onChange={setLargo} suffix="m" />
          </View>
          <View style={{ flex: 1 }}>
            <NumberField label="Ancho" value={ancho} onChange={setAncho} suffix="m" />
          </View>
        </View>
        <NumberField label="Espesor total" value={espesorTotal} onChange={setEspesorTotal} suffix="cm" />
      </Card>

      <Card>
        <Text style={styles.section}>2. Casetón y nervadura</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <NumberField label="Largo casetón" value={largoCas} onChange={setLargoCas} suffix="cm" />
          </View>
          <View style={{ flex: 1 }}>
            <NumberField label="Ancho casetón" value={anchoCas} onChange={setAnchoCas} suffix="cm" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <NumberField label="Peralte casetón" value={peralteCas} onChange={setPeralteCas} suffix="cm" />
          </View>
          <View style={{ flex: 1 }}>
            <NumberField label="Ancho nervadura" value={anchoNerv} onChange={setAnchoNerv} suffix="cm" />
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>3. Acero de nervaduras</Text>
        <Label>Calibre longitudinal</Label>
        <View style={styles.chipRow}>
          {CALIBRES_LIST.slice(0, 6).map((c) => (
            <Text
              key={c}
              onPress={() => setCalibreLong(c)}
              style={[styles.chip, calibreLong === c && styles.chipActive]}
            >
              {c}
            </Text>
          ))}
        </View>
        <NumberField label="Varillas por nervadura" value={varPorNerv} onChange={setVarPorNerv} suffix="pza" />
        <Label>Calibre estribo</Label>
        <View style={styles.chipRow}>
          {CALIBRES_LIST.slice(0, 4).map((c) => (
            <Text
              key={c}
              onPress={() => setCalibreEstr(c)}
              style={[styles.chip, calibreEstr === c && styles.chipActive]}
            >
              {c}
            </Text>
          ))}
        </View>
        <NumberField label="Separación estribos" value={sepEstr} onChange={setSepEstr} suffix="cm" />
      </Card>

      <Card>
        <Text style={styles.section}>4. Malla y concreto</Text>
        <Label>Malla electrosoldada</Label>
        <View style={[styles.chipRow, { marginBottom: 8 }]}>
          {MALLA_IDS.map((id) => (
            <Text
              key={id}
              onPress={() => setMallaId(id)}
              style={[styles.chip, mallaId === id && styles.chipActive]}
            >
              {MALLAS[id].nombre.split(' ')[0]}
            </Text>
          ))}
        </View>
        <Label>Dosificación de concreto</Label>
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
      </Card>

      {resultado ? (
        <>
          <Card>
            <Text style={styles.section}>Resumen</Text>
            <Row left="Área" right={`${formatoNumero(resultado.areaM2, 2)} m²`} />
            <Row left="Capa de compresión" right={`${formatoNumero(resultado.espesorCapaCompresionM * 100, 1)} cm`} />
            <Row left="Casetones" right={`${resultado.numCasetones} pza`} bold />
            <Row left="Nervaduras" right={`${resultado.numNervaduras} de ${formatoNumero(resultado.longNervaduraM, 2)} m`} />
            <Row left="Concreto" right={`${formatoNumero(resultado.volumenConcretoM3, 3)} m³`} bold />
            <Row left={`Acero ${resultado.detalleLongitudinal.calibre}`} right={`${formatoNumero(resultado.detalleLongitudinal.pesoKg, 1)} kg`} />
            <Row left={`Estribos ${resultado.detalleEstribos.calibre}`} right={`${formatoNumero(resultado.detalleEstribos.pesoKg, 1)} kg / ${resultado.detalleEstribos.cantidadTotal} pza`} />
            <Row left="Malla" right={`${formatoNumero(resultado.mallaM2, 1)} m² (${resultado.rollosMalla} rollos)`} />
          </Card>

          <Card>
            <Text style={styles.section}>Materiales detallados</Text>
            {resultado.materiales.map((m) => (
              <View key={m.material} style={styles.matBlock}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.matName}>{m.etiqueta}</Text>
                  <Text style={styles.matValue}>
                    {m.unidad === 'kg' || m.unidad === 'pza'
                      ? `${formatoEntero(m.cantidad)} ${m.unidad}`
                      : m.unidad === 'L'
                        ? `${formatoEntero(m.cantidad)} L`
                        : `${formatoNumero(m.cantidad, 3)} ${m.unidad}`}
                  </Text>
                </View>
                {m.equivalencias?.map((e, i) => (
                  <Text key={i} style={styles.matEq}>
                    └─ {e.etiqueta}:{' '}
                    {e.unidad === 'sacos' || e.unidad === 'botes' || e.unidad === 'pza' || e.unidad === 'rollos'
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
            {resultado.manoObra.map((mo) => (
              <View key={mo.conceptoId} style={{ marginBottom: 6 }}>
                <Row left={mo.nombre} right={`${formatoNumero(mo.cantidad, 2)} ${mo.unidad} × ${formatoMXN(mo.tarifa)}`} />
                <Row left="Total M.O." right={formatoMXN(mo.total)} bold />
              </View>
            ))}
          </Card>

          <Card>
            <Row left="Costo materiales" right={formatoMXN(resultado.costoMateriales)} />
            <Row left="Costo mano de obra" right={formatoMXN(resultado.costoManoObra)} />
            <Row left="TOTAL" right={formatoMXN(resultado.costoTotal)} bold />
          </Card>

          <GuardarEnProyectoButton
            tipo="losa-aligerada"
            etiqueta={`Losa aligerada ${largo}×${ancho}`}
            inputs={{
              largo, ancho, espesorTotal, largoCas, anchoCas, peralteCas,
              anchoNerv, calibreLong, varPorNerv, calibreEstr, sepEstr,
              mallaId, dosId,
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
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#f1f5f9', borderRadius: 999,
    fontSize: 13, color: colors.text, overflow: 'hidden',
  },
  chipActive: { backgroundColor: colors.primary, color: '#fff', fontWeight: '700' },
  matBlock: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  matName: { fontSize: 14, fontWeight: '700', color: colors.text },
  matValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
  matEq: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  matCost: { fontSize: 13, color: colors.success, marginTop: 4, fontWeight: '700' },
});
