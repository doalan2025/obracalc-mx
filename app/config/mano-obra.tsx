import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Button, Card, colors, Label, NumberField } from '@/components/UI';
import { useManoObraStore } from '@/store/manoObraStore';
import { formatoMXN, parsearNumero } from '@/utils/formato';
import type { UnidadManoObra } from '@/core/types';

const UNIDADES: { v: UnidadManoObra; label: string }[] = [
  { v: 'm2', label: 'm²' },
  { v: 'ml', label: 'ml' },
  { v: 'm3', label: 'm³' },
  { v: 'pza', label: 'pza' },
  { v: 'jornal', label: 'jornal' },
];

export default function ManoObraScreen() {
  const { conceptos, actualizarTarifa, agregar, eliminar, restaurarDefaults } =
    useManoObraStore();

  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaTarifa, setNuevaTarifa] = useState('');
  const [nuevaUnidad, setNuevaUnidad] = useState<UnidadManoObra>('m2');

  const onAgregar = () => {
    const tarifa = parsearNumero(nuevaTarifa);
    if (!nuevoNombre.trim() || !isFinite(tarifa) || tarifa <= 0) {
      Alert.alert('Datos incompletos', 'Escribe un nombre y una tarifa válida.');
      return;
    }
    agregar({ nombre: nuevoNombre.trim(), unidad: nuevaUnidad, tarifa });
    setNuevoNombre('');
    setNuevaTarifa('');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <Text style={styles.intro}>
          Edita las tarifas que cobra tu albañil. Las calculadoras las aplicarán
          automáticamente. La unidad indica cómo se cobra (m², metro lineal,
          metro cúbico, pieza o jornal por día).
        </Text>
      </Card>

      {conceptos.map((c) => (
        <Card key={c.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nombre}>{c.nombre}</Text>
            <Text style={styles.unidad}>Unidad: {c.unidad}</Text>
          </View>
          <View style={{ width: 130 }}>
            <NumberField
              label="Tarifa MXN"
              value={String(c.tarifa)}
              onChange={(v) => actualizarTarifa(c.id, parsearNumero(v) || 0)}
              suffix={`/${c.unidad}`}
            />
          </View>
          <Trash2
            color={colors.danger}
            size={20}
            onPress={() =>
              Alert.alert(
                'Eliminar concepto',
                `¿Eliminar "${c.nombre}"?`,
                [
                  { text: 'Cancelar' },
                  {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => eliminar(c.id),
                  },
                ],
              )
            }
          />
        </Card>
      ))}

      <Card>
        <Text style={styles.subTitle}>Agregar nuevo concepto</Text>
        <View style={{ marginBottom: 8 }}>
          <Label>Nombre</Label>
          <View style={styles.input}>
            <TextLikeInput value={nuevoNombre} onChange={setNuevoNombre} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <NumberField
              label="Tarifa"
              value={nuevaTarifa}
              onChange={setNuevaTarifa}
              suffix="MXN"
            />
          </View>
          <View style={{ width: 140 }}>
            <Label>Unidad</Label>
            <View style={styles.unidadGrid}>
              {UNIDADES.map((u) => (
                <Text
                  key={u.v}
                  onPress={() => setNuevaUnidad(u.v)}
                  style={[
                    styles.unidadOpt,
                    nuevaUnidad === u.v && styles.unidadOptActive,
                  ]}
                >
                  {u.label}
                </Text>
              ))}
            </View>
          </View>
        </View>
        <Button title="+ Agregar concepto" onPress={onAgregar} />
      </Card>

      <Card>
        <Text style={styles.subTitle}>Resumen rápido</Text>
        {conceptos.slice(0, 5).map((c) => (
          <View key={c.id} style={styles.summaryRow}>
            <Text style={styles.summaryLeft}>{c.nombre}</Text>
            <Text style={styles.summaryRight}>
              {formatoMXN(c.tarifa)} /{c.unidad}
            </Text>
          </View>
        ))}
      </Card>

      <Button
        title="Restaurar valores por defecto"
        variant="secondary"
        onPress={() =>
          Alert.alert(
            'Restaurar',
            '¿Volver a las tarifas predeterminadas?',
            [
              { text: 'Cancelar' },
              { text: 'Restaurar', onPress: restaurarDefaults },
            ],
          )
        }
      />
    </ScrollView>
  );
}

// Mini wrapper para texto plano (evita re-importar TextInput aquí)
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
      placeholder="Ej. Aplicación de boquilla"
      placeholderTextColor="#94a3b8"
    />
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nombre: { fontSize: 14, fontWeight: '700', color: colors.text },
  unidad: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  subTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  unidadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  unidadOpt: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    fontSize: 13,
    color: colors.text,
    overflow: 'hidden',
  },
  unidadOptActive: {
    backgroundColor: colors.primary,
    color: '#fff',
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLeft: { color: colors.text, fontSize: 14 },
  summaryRight: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
