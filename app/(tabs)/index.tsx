import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, colors, Pill } from '@/components/UI';

type Calc = {
  id: string;
  titulo: string;
  desc: string;
  ruta?: string;
  proximo?: boolean;
  emoji: string;
};

const CALCULADORAS: Calc[] = [
  {
    id: 'concreto',
    titulo: 'Concreto',
    desc: 'Losas, firmes, zapatas, plantillas. Genera sacos de 50/25 kg y botes de 19 L.',
    ruta: '/calc/concreto',
    emoji: '🧱',
  },
  {
    id: 'piedra',
    titulo: 'Piedra / Bardas',
    desc: 'Bardas, cimientos y muros de piedra. Calcula piedra, mortero (cemento, cal, arena) y M.O. por m² o m³.',
    ruta: '/calc/piedra',
    emoji: '🪨',
  },
  {
    id: 'castillo-trabe',
    titulo: 'Castillo / Trabe / Columna',
    desc: 'Concreto + acero longitudinal + estribos detallados. Castillos, trabes, cadenas y columnas con M.O. por ml o pza.',
    ruta: '/calc/castillo-trabe',
    emoji: '🏗️',
  },
  {
    id: 'zapata',
    titulo: 'Zapata (aislada / corrida)',
    desc: 'Concreto + acero parrilla (aislada) o longitudinal+estribos (corrida). M.O. por pza o ml.',
    ruta: '/calc/zapata',
    emoji: '🔲',
  },
  {
    id: 'losa-maciza',
    titulo: 'Losa maciza',
    desc: 'Concreto + parrilla de acero en 2 sentidos + bastones. Para losas pequeñas o azoteas.',
    ruta: '/calc/losa-maciza',
    emoji: '🟪',
  },
  {
    id: 'losa-aligerada',
    titulo: 'Losa aligerada',
    desc: 'Casetón + nervaduras + capa de compresión + malla. Sistema completo de entrepiso.',
    ruta: '/calc/losa-aligerada',
    emoji: '🟫',
  },
  {
    id: 'firme',
    titulo: 'Firme de concreto',
    desc: 'Firme con o sin malla electrosoldada. Cemento, arena, grava y M.O. por m².',
    ruta: '/calc/firme',
    emoji: '⬜',
  },
  {
    id: 'escalera',
    titulo: 'Escalera de concreto',
    desc: 'Escalones + losa de rampa + acero. Calcula # de peldaños, longitud horizontal y de rampa.',
    ruta: '/calc/escalera',
    emoji: '🪜',
  },
  {
    id: 'cisterna',
    titulo: 'Cisterna / Tinaco',
    desc: 'Capacidad en m³ y litros + concreto + acero + impermeabilización interior.',
    ruta: '/calc/cisterna',
    emoji: '🪣',
  },
  {
    id: 'pintura',
    titulo: 'Pintura',
    desc: 'Vinílica, esmalte, impermeabilizante. Cubetas 19 L, galones, litros con manos y rendimiento.',
    ruta: '/calc/pintura',
    emoji: '🎨',
  },
  {
    id: 'impermeabilizacion',
    titulo: 'Impermeabilización',
    desc: 'Membrana asfáltica (rollos) o líquido (cubetas 19 L) por manos. M.O. por m².',
    ruta: '/calc/impermeabilizacion',
    emoji: '🛡️',
  },
  {
    id: 'yeso',
    titulo: 'Aplanado de yeso',
    desc: 'Sacos de yeso 40 kg por m² y espesor. M.O. por m².',
    ruta: '/calc/yeso',
    emoji: '⚪',
  },
  {
    id: 'tablaroca',
    titulo: 'Plafón / Muro tablaroca',
    desc: 'Láminas + tornillos + pasta + cinta + perfiles canal U y postes.',
    ruta: '/calc/tablaroca',
    emoji: '⬛',
  },
  {
    id: 'muro-block',
    titulo: 'Muro de block / tabique',
    desc: 'Block 12/15/20 o tabique rojo. Piezas, mortero y M.O. por m². Soporta vanos.',
    ruta: '/calc/muro-block',
    emoji: '🧱',
  },
  {
    id: 'repellado',
    titulo: 'Repellado / aplanado',
    desc: 'Mortero por m² y espesor, 1 o 2 caras. Cemento, cal, arena y M.O. por m².',
    ruta: '/calc/repellado',
    emoji: '🎨',
  },
  {
    id: 'loseta',
    titulo: 'Pegado de loseta',
    desc: 'Loseta + adhesivo (pegazulejo) + boquilla. Múltiples formatos y M.O. por m².',
    ruta: '/calc/loseta',
    emoji: '🟩',
  },
  {
    id: 'acero',
    titulo: 'Acero de refuerzo',
    desc: 'Despieces por calibre (#2 a #12), peso, varillas comerciales y alambre recocido.',
    ruta: '/calc/acero',
    emoji: '🔩',
  },
];

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={styles.greeting}>👷 Bienvenido a ObraCalc MX</Text>
        <Text style={styles.greetingSub}>
          Calculadora 100% offline, en pesos mexicanos, con sacos de 50/25 kg,
          bultos de cal de 25 kg y conteo en botes de 19 L.
        </Text>
      </Card>

      <Text style={styles.sectionLabel}>Calculadoras</Text>
      {CALCULADORAS.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => c.ruta && router.push(c.ruta as never)}
          disabled={c.proximo}
          style={({ pressed }) => [
            styles.calc,
            pressed && !c.proximo && { opacity: 0.85 },
            c.proximo && { opacity: 0.55 },
          ]}
        >
          <Text style={styles.emoji}>{c.emoji}</Text>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.calcTitle}>{c.titulo}</Text>
              {c.proximo ? <Pill text="próximo" /> : <Pill text="listo" />}
            </View>
            <Text style={styles.calcDesc}>{c.desc}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  greeting: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  greetingSub: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  sectionLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  calc: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    gap: 12,
    alignItems: 'flex-start',
  },
  emoji: { fontSize: 28 },
  calcTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  calcDesc: { color: colors.textMuted, fontSize: 13, marginTop: 2, lineHeight: 18 },
});
