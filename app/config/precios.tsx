import { Alert, ScrollView } from 'react-native';
import { Button, Card, NumberField } from '@/components/UI';
import { usePreciosStore } from '@/store/preciosStore';
import { parsearNumero } from '@/utils/formato';

const CAMPOS: { key: keyof ReturnType<typeof usePreciosStore.getState>['precios']; label: string; suffix: string }[] = [
  { key: 'cementoSaco50', label: 'Cemento gris — saco 50 kg', suffix: 'MXN/saco' },
  { key: 'cementoSaco25', label: 'Cemento gris — saco 25 kg', suffix: 'MXN/saco' },
  { key: 'calBulto25',    label: 'Cal — bulto 25 kg',          suffix: 'MXN/bulto' },
  { key: 'arenaM3',       label: 'Arena',                       suffix: 'MXN/m³' },
  { key: 'gravaM3',       label: 'Grava',                       suffix: 'MXN/m³' },
  { key: 'piedraM3',      label: 'Piedra (braza/río) — m³',     suffix: 'MXN/m³' },
  { key: 'piedraTon',     label: 'Piedra — tonelada (alterno)', suffix: 'MXN/t' },
  { key: 'aguaM3',        label: 'Agua',                        suffix: 'MXN/m³' },
  { key: 'block12',       label: 'Block 12×20×40',              suffix: 'MXN/pza' },
  { key: 'block15',       label: 'Block 15×20×40',              suffix: 'MXN/pza' },
  { key: 'block20',       label: 'Block 20×20×40',              suffix: 'MXN/pza' },
  { key: 'tabiqueRojo',   label: 'Tabique rojo recocido',       suffix: 'MXN/pza' },
  { key: 'losetaM2',      label: 'Loseta cerámica',             suffix: 'MXN/m²' },
  { key: 'adhesivoSaco',  label: 'Adhesivo loseta — saco 20 kg',suffix: 'MXN/saco' },
  { key: 'boquillaKg',    label: 'Boquilla',                    suffix: 'MXN/kg' },
  { key: 'aceroKg',       label: 'Varilla corrugada',           suffix: 'MXN/kg' },
  { key: 'alambreKg',     label: 'Alambre recocido',            suffix: 'MXN/kg' },
  { key: 'casetonPza',    label: 'Casetón (60×20×20)',          suffix: 'MXN/pza' },
  { key: 'mallaM2',       label: 'Malla electrosoldada',        suffix: 'MXN/m²' },
  { key: 'pinturaCubeta', label: 'Pintura — cubeta 19 L',       suffix: 'MXN/cubeta' },
  { key: 'pinturaGalon',  label: 'Pintura — galón',             suffix: 'MXN/galón' },
  { key: 'yesoSaco',      label: 'Yeso — saco 40 kg',           suffix: 'MXN/saco' },
  { key: 'membranaRollo', label: 'Membrana asfáltica — rollo 10 m²', suffix: 'MXN/rollo' },
  { key: 'impermeabilizanteCubeta', label: 'Impermeabilizante — cubeta 19 L', suffix: 'MXN/cubeta' },
  { key: 'laminaTablaroca', label: 'Lámina tablaroca 1.22×2.44', suffix: 'MXN/pza' },
];

export default function PreciosScreen() {
  const { precios, actualizar, restaurarDefaults } = usePreciosStore();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        {CAMPOS.map((c) => (
          <NumberField
            key={c.key}
            label={c.label}
            value={String(precios[c.key])}
            onChange={(v) =>
              actualizar({ [c.key]: parsearNumero(v) || 0 } as never)
            }
            suffix={c.suffix}
          />
        ))}
      </Card>

      <Button
        title="Restaurar precios sugeridos"
        variant="secondary"
        onPress={() =>
          Alert.alert(
            'Restaurar',
            '¿Volver a los precios predeterminados?',
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
