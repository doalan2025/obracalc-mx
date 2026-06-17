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
  CALIBRES_VARILLA,
  type CalibreVarilla,
} from '@/core/constants/acero';
import { calcularAcero, type PartidaAcero } from '@/core/calculators/acero';
import { usePreciosStore } from '@/store/preciosStore';
import {
  formatoEntero,
  formatoMXN,
  formatoNumero,
  parsearNumero,
} from '@/utils/formato';
import { GuardarEnProyectoButton } from '@/components/GuardarEnProyectoButton';

const CALIBRES_LIST = Object.keys(CALIBRES_VARILLA) as CalibreVarilla[];

export default function CalcAceroScreen() {
  const { precios } = usePreciosStore();

  const [partidas, setPartidas] = useState<PartidaAcero[]>([
    { nombre: 'Castillo C1 longitudinales', calibre: '#3', longitudPorPieza: 3, cantidad: 4 },
    { nombre: 'Castillo C1 estribos',       calibre: '#2', longitudPorPieza: 0.6, cantidad: 12 },
  ]);
  const [traslapes, setTraslapes] = useState('5');
  const [pctAlambre, setPctAlambre] = useState('1.5');
  const [longComercial, setLongComercial] = useState('12');

  // Form de nueva partida
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoCalibre, setNuevoCalibre] = useState<CalibreVarilla>('#3');
  const [nuevaLongitud, setNuevaLongitud] = useState('3');
  const [nuevaCantidad, setNuevaCantidad] = useState('4');

  const agregarPartida = () => {
    const L = parsearNumero(nuevaLongitud);
    const C = parsearNumero(nuevaCantidad);
    if (!isFinite(L) || !isFinite(C) || L <= 0 || C <= 0) {
      Alert.alert('Datos incompletos', 'Captura una longitud y cantidad válidas.');
      return;
    }
    setPartidas((ps) => [
      ...ps,
      {
        nombre: nuevoNombre.trim() || 'Partida',
        calibre: nuevoCalibre,
        longitudPorPieza: L,
        cantidad: C,
      },
    ]);
    setNuevoNombre('');
  };

  const resultado = useMemo(() => {
    return calcularAcero({
      partidas,
      porcentajeTraslapesPct: parsearNumero(traslapes),
      porcentajeAlambrePct: parsearNumero(pctAlambre),
      longitudComercialM: parsearNumero(longComercial),
      precios: { aceroKg: precios.aceroKg, alambreKg: precios.alambreKg },
    });
  }, [partidas, traslapes, pctAlambre, longComercial, precios]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.section}>1. Partidas de acero</Text>
        {partidas.length === 0 ? (
          <Text style={styles.hint}>
            No hay partidas. Agrega abajo (longitudinales, estribos, etc.).
          </Text>
        ) : (
          partidas.map((p, i) => {
            const cal = CALIBRES_VARILLA[p.calibre];
            return (
              <View key={i} style={styles.partidaRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.partidaName}>
                    {p.nombre || 'Partida'}{' '}
                    <Text style={styles.partidaTag}>
                      {p.calibre} ({cal.pulgadas})
                    </Text>
                  </Text>
                  <Text style={styles.partidaSub}>
                    {p.cantidad} pza × {p.longitudPorPieza} m ={' '}
                    {formatoNumero(p.cantidad * p.longitudPorPieza, 2)} ml
                  </Text>
                </View>
                <Trash2
                  color={colors.danger}
                  size={18}
                  onPress={() =>
                    setPartidas((ps) => ps.filter((_, j) => j !== i))
                  }
                />
              </View>
            );
          })
        )}
      </Card>

      <Card>
        <Text style={styles.section}>Agregar partida</Text>
        <Label>Nombre</Label>
        <View style={styles.input}>
          <TextLikeInput value={nuevoNombre} onChange={setNuevoNombre} />
        </View>
        <Label>Calibre</Label>
        <View style={styles.chipRow}>
          {CALIBRES_LIST.map((c) => (
            <Text
              key={c}
              onPress={() => setNuevoCalibre(c)}
              style={[styles.chip, nuevoCalibre === c && styles.chipActive]}
            >
              {c}
            </Text>
          ))}
        </View>
        <Text style={styles.hint}>
          Seleccionado: {nuevoCalibre} ({CALIBRES_VARILLA[nuevoCalibre].pulgadas}) ·{' '}
          {CALIBRES_VARILLA[nuevoCalibre].kgPorMetro} kg/m
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <NumberField
              label="Longitud por pieza"
              value={nuevaLongitud}
              onChange={setNuevaLongitud}
              suffix="m"
            />
          </View>
          <View style={{ flex: 1 }}>
            <NumberField
              label="Cantidad"
              value={nuevaCantidad}
              onChange={setNuevaCantidad}
              suffix="pza"
            />
          </View>
        </View>
        <Button title="+ Agregar partida" onPress={agregarPartida} />
      </Card>

      <Card>
        <Text style={styles.section}>2. Ajustes</Text>
        <NumberField
          label="Incremento por traslapes / desperdicio"
          value={traslapes}
          onChange={setTraslapes}
          suffix="%"
        />
        <NumberField
          label="Alambre recocido"
          value={pctAlambre}
          onChange={setPctAlambre}
          suffix="% del acero"
        />
        <NumberField
          label="Longitud comercial de varilla"
          value={longComercial}
          onChange={setLongComercial}
          suffix="m"
        />
      </Card>

      {resultado.partidas.length > 0 ? (
        <>
          <Card>
            <Text style={styles.section}>Resumen por calibre</Text>
            {resultado.porCalibre.map((c) => (
              <View key={c.calibre} style={styles.calibreBlock}>
                <View
                  style={{ flexDirection: 'row', justifyContent: 'space-between' }}
                >
                  <Text style={styles.matName}>
                    Varilla {c.calibre} ({c.pulgadas})
                  </Text>
                  <Pill text={`${c.varillasComerciales} pza`} />
                </View>
                <Text style={styles.matEq}>
                  └─ {formatoNumero(c.mlTotal, 2)} ml · {formatoNumero(c.pesoKg, 2)} kg
                </Text>
              </View>
            ))}
          </Card>

          <Card>
            <Text style={styles.section}>Detalle por partida</Text>
            {resultado.partidas.map((sp, i) => (
              <View key={i} style={styles.calibreBlock}>
                <Text style={styles.matName}>
                  {sp.partida.nombre} ({sp.partida.calibre})
                </Text>
                <Text style={styles.matEq}>
                  └─ {formatoNumero(sp.mlBase, 2)} ml × {formatoNumero(1 + parsearNumero(traslapes) / 100, 3)} ={' '}
                  {formatoNumero(sp.mlConTraslapes, 2)} ml ={' '}
                  {formatoNumero(sp.pesoKg, 2)} kg
                </Text>
                <Text style={styles.matEq}>
                  └─ Varillas comerciales: {sp.varillasComerciales} pza
                </Text>
              </View>
            ))}
          </Card>

          <Card>
            <Row
              left="Peso total acero"
              right={`${formatoNumero(resultado.pesoTotalKg, 2)} kg`}
              bold
            />
            <Row
              left="Alambre recocido"
              right={`${formatoNumero(resultado.alambreKg, 2)} kg`}
            />
            {precios.aceroKg > 0 ? (
              <Row left="Costo acero" right={formatoMXN(resultado.pesoTotalKg * precios.aceroKg)} />
            ) : null}
            {precios.alambreKg > 0 ? (
              <Row left="Costo alambre" right={formatoMXN(resultado.alambreKg * precios.alambreKg)} />
            ) : null}
            <Row
              left="TOTAL materiales"
              right={formatoMXN(resultado.costoMateriales)}
              bold
            />
            <Text style={styles.hint}>
              La mano de obra del armado va incluida en castillos, trabes,
              columnas y losas (ver sus calculadoras).
            </Text>
          </Card>

          <Button
            title="Compartir resumen"
            onPress={() => {
              const lines = [
                `ObraCalc MX — Acero de refuerzo`,
                `Partidas: ${resultado.partidas.length}  |  Traslapes: ${traslapes}%  |  Alambre: ${pctAlambre}%`,
                '',
                'Por calibre:',
                ...resultado.porCalibre.map(
                  (c) =>
                    `  ${c.calibre} (${c.pulgadas}): ${formatoNumero(c.pesoKg, 2)} kg | ${formatoNumero(c.mlTotal, 2)} ml | ${c.varillasComerciales} varillas de ${longComercial} m`,
                ),
                '',
                `Peso total acero: ${formatoNumero(resultado.pesoTotalKg, 2)} kg`,
                `Alambre recocido: ${formatoNumero(resultado.alambreKg, 2)} kg`,
                `Costo materiales: ${formatoMXN(resultado.costoMateriales)}`,
              ].join('\n');
              Alert.alert('Resumen', lines);
            }}
          />

          <GuardarEnProyectoButton
            tipo="acero"
            etiqueta={`Acero ${resultado.partidas.length} partidas (${formatoNumero(resultado.pesoTotalKg, 0)} kg)`}
            inputs={{ partidas, traslapes, pctAlambre, longComercial }}
            resultado={resultado}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

import { TextInput } from 'react-native';
function TextLikeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <TextInput
      style={{ flex: 1, paddingVertical: 10, fontSize: 16, color: colors.text }}
      value={value}
      onChangeText={onChange}
      placeholder="Ej. Castillo C1 longitudinales"
      placeholderTextColor="#94a3b8"
    />
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
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  partidaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  partidaName: { fontSize: 14, fontWeight: '700', color: colors.text },
  partidaTag: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  partidaSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  calibreBlock: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  matName: { fontSize: 14, fontWeight: '700', color: colors.text },
  matEq: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
