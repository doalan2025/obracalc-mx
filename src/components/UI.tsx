/**
 * Componentes UI ligeros — sin dependencias de librerías de design system.
 * Suficiente para el MVP y portable a Android, iOS y Web.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export const colors = {
  primary: '#1f6feb',
  primaryDark: '#1a5dd1',
  bg: '#f5f7fb',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#475569',
  success: '#16a34a',
  danger: '#dc2626',
};

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Section({
  title,
  children,
  right,
}: {
  title: string;
  children?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Label({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Label>{label}</Label>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : '#e2e8f0';
  const fg = variant === 'secondary' ? colors.text : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Pill({ text }: { text: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

export function Row({
  left,
  right,
  bold,
}: {
  left: string;
  right: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLeft, bold && { fontWeight: '700' }]}>{left}</Text>
      <Text style={[styles.rowRight, bold && { fontWeight: '700' }]}>
        {right}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  suffix: {
    marginLeft: 8,
    color: colors.textMuted,
    fontSize: 14,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 4,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  pill: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillText: {
    color: '#3730a3',
    fontSize: 11,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLeft: { color: colors.text, fontSize: 14 },
  rowRight: { color: colors.text, fontSize: 14, fontWeight: '600' },
});
