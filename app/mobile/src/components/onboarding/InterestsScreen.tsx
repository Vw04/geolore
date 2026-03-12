import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = { onDone: (interests: string[]) => void; onBack: () => void };

const ALL_INTERESTS: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'History',             icon: 'time-outline' },
  { label: 'Science & Tech',      icon: 'flask-outline' },
  { label: 'Arts & Culture',      icon: 'color-palette-outline' },
  { label: 'Music',               icon: 'musical-notes-outline' },
  { label: 'Society & Politics',  icon: 'people-outline' },
  { label: 'Nature & Geography',  icon: 'leaf-outline' },
  { label: 'Trivia & Quirky',     icon: 'star-outline' },
  { label: 'All',                 icon: 'globe-outline' },
];

export default function InterestsScreen({ onDone, onBack }: Props) {
  const [selected, setSelected] = useState<string[]>(['All']);

  const toggle = (label: string) => {
    if (label === 'All') {
      setSelected(['All']);
      return;
    }
    setSelected((prev) => {
      const without = prev.filter((s) => s !== 'All');
      if (without.includes(label)) {
        const next = without.filter((s) => s !== label);
        return next.length === 0 ? ['All'] : next;
      }
      return [...without, label];
    });
  };

  const rows = [];
  for (let i = 0; i < ALL_INTERESTS.length; i += 2) {
    rows.push(ALL_INTERESTS.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>What interests you?</Text>
        <Text style={styles.subtitle}>We'll surface facts you'll actually want to talk about.</Text>
      </View>
      <View style={styles.grid}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map(({ label, icon }) => {
              const active = selected.includes(label);
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggle(label)}
                >
                  <Ionicons name={icon} size={36} color="#FFFFF0" />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={() => onDone(selected)}>
          <Text style={styles.buttonText}>Start Exploring</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={16} color="rgba(255,255,240,0.55)" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D2218',
    paddingHorizontal: 28,
    paddingTop: 100,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  header: {
    gap: 10,
  },
  title: {
    fontFamily: 'Helvetica',
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFF0',
  },
  subtitle: {
    fontFamily: 'Helvetica',
    fontSize: 14,
    color: 'rgba(255,255,240,0.65)',
    lineHeight: 20,
  },
  grid: {
    flex: 1,
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  chip: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    minHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFF0',
    backgroundColor: '#1A3828',
  },
  chipActive: {
    backgroundColor: '#1E5038',
    borderColor: '#FFFFF0',
  },
  chipText: {
    fontFamily: 'Helvetica',
    fontSize: 16,
    color: '#FFFFF0',
    textAlign: 'center',
  },
  chipTextActive: {
    color: '#FFFFF0',
    fontWeight: '600',
  },
  footer: {
    gap: 14,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontFamily: 'Helvetica',
    fontSize: 14,
    color: 'rgba(255,255,240,0.55)',
  },
  button: {
    backgroundColor: '#1A3828',
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFF0',
  },
});
