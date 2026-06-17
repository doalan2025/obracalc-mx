import { Tabs } from 'expo-router';
import { Calculator, Settings, FolderOpen } from 'lucide-react-native';
import { colors } from '@/components/UI';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarStyle: { backgroundColor: '#fff' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Calculadoras',
          headerTitle: 'ObraCalc MX',
          tabBarIcon: ({ color, size }) => (
            <Calculator color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="proyectos"
        options={{
          title: 'Proyectos',
          tabBarIcon: ({ color, size }) => (
            <FolderOpen color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="configuracion"
        options={{
          title: 'Configuración',
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
