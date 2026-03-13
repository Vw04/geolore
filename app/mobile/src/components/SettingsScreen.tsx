import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import BrandLogo from './BrandLogo';
import type { NotifSettings, DisplaySettings } from '../services/keystore';
import { startWalkAround, stopWalkAround, isWalkAroundRunning } from '../services/walkAround';

const ALL_INTERESTS = [
  'History', 'Science & Tech', 'Arts & Culture', 'Music',
  'Society & Politics', 'Nature & Geography', 'Trivia & Quirky', 'All',
];

const FREQ_OPTIONS: { label: string; value: NotifSettings['frequencyMs'] }[] = [
  { label: '1 min',  value: 60000 },
  { label: '5 mins', value: 300000 },
  { label: '10 mins', value: 600000 },
  { label: '30 mins', value: 1800000 },
];

const BULLET_OPTIONS: NotifSettings['bulletCount'][] = [1, 2, 3];

type Props = {
  visible: boolean;
  interests: string[];
  notifSettings: NotifSettings;
  displaySettings: DisplaySettings;
  onSave: (interests: string[], notif: NotifSettings, display: DisplaySettings) => void;
  onClose: () => void;
};

export default function SettingsScreen({ visible, interests, notifSettings, displaySettings, onSave, onClose }: Props) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>(interests);
  const [notif, setNotif] = useState<NotifSettings>(notifSettings);
  const [display, setDisplay] = useState<DisplaySettings>(displaySettings);

  // Sync toggle with actual OS walk-around state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedInterests(interests);
      setNotif(notifSettings);
      setDisplay(displaySettings);
      isWalkAroundRunning().then((running) => {
        setNotif((prev) => ({ ...prev, enabled: running }));
      });
    }
  }, [visible, interests, notifSettings, displaySettings]);

  const handleWalkAroundToggle = async (val: boolean) => {
    if (val) {
      const { started, reason } = await startWalkAround();
      if (!started) {
        Alert.alert('Permission Required', reason ?? 'Could not start walk-around mode.');
        return;
      }
    } else {
      await stopWalkAround();
    }
    setNotif((prev) => ({ ...prev, enabled: val }));
  };

  const toggleInterest = (label: string) => {
    if (label === 'All') { setSelectedInterests(['All']); return; }
    setSelectedInterests((prev) => {
      const without = prev.filter((s) => s !== 'All');
      if (without.includes(label)) {
        const next = without.filter((s) => s !== label);
        return next.length === 0 ? ['All'] : next;
      }
      return [...without, label];
    });
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BrandLogo size="md" />
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>INTERESTS</Text>
          <View style={styles.chipGrid}>
            {ALL_INTERESTS.map((label) => {
              const active = selectedInterests.includes(label);
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleInterest(label)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>SORT ORDER</Text>
          <View style={styles.segRow}>
            {(['distance', 'notable'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.seg, display.sortOrder === opt && styles.segActive]}
                onPress={() => setDisplay({ ...display, sortOrder: opt })}
              >
                <Text style={[styles.segText, display.sortOrder === opt && styles.segTextActive]}>
                  {opt === 'distance' ? 'Closest Distance' : 'Most Notable'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>MAX FACTS PER REFRESH</Text>
          <Text style={styles.subLabel}>Up to {display.maxFacts} fact{display.maxFacts === 1 ? '' : 's'}</Text>
          <Slider
            style={{ width: '100%', height: 32 }}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={display.maxFacts}
            onValueChange={(v) => setDisplay({ ...display, maxFacts: Math.round(v) })}
            minimumTrackTintColor="#2A9D8F"
            maximumTrackTintColor="#1E5038"
            thumbTintColor="#FFFFF0"
          />

          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Walk-around mode</Text>
            <Switch
              value={notif.enabled}
              onValueChange={handleWalkAroundToggle}
              trackColor={{ false: '#1E5038', true: '#2A9D8F' }}
              thumbColor="#FFFFF0"
            />
          </View>

          <Text style={styles.subLabel}>Frequency</Text>
          <View style={styles.segRow}>
            {FREQ_OPTIONS.map(({ label, value }) => (
              <TouchableOpacity
                key={value}
                style={[styles.seg, notif.frequencyMs === value && styles.segActive]}
                onPress={() => setNotif({ ...notif, frequencyMs: value })}
              >
                <Text style={[styles.segText, notif.frequencyMs === value && styles.segTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.subLabel}>Facts per notification</Text>
          <View style={styles.segRow}>
            {BULLET_OPTIONS.map((count) => (
              <TouchableOpacity
                key={count}
                style={[styles.seg, notif.bulletCount === count && styles.segActive]}
                onPress={() => setNotif({ ...notif, bulletCount: count })}
              >
                <Text style={[styles.segText, notif.bulletCount === count && styles.segTextActive]}>
                  {count} {count === 1 ? 'bullet' : 'bullets'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(selectedInterests, notif, display)}>
            <Text style={styles.saveBtnText}>Save Settings</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D2218',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E5038',
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    color: 'rgba(255,255,240,0.55)',
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  sectionLabel: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,240,0.4)',
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E5038',
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#162E20',
    borderColor: '#2A9D8F',
  },
  chipText: {
    fontFamily: 'Helvetica',
    fontSize: 12,
    color: 'rgba(255,255,240,0.55)',
  },
  chipTextActive: {
    color: '#FFFFF0',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rowLabel: {
    fontFamily: 'Helvetica',
    fontSize: 15,
    color: '#FFFFF0',
  },
  subLabel: {
    fontFamily: 'Helvetica',
    fontSize: 13,
    color: 'rgba(255,255,240,0.55)',
    marginBottom: 10,
    marginTop: 4,
  },
  segRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  seg: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E5038',
  },
  segActive: {
    backgroundColor: '#162E20',
    borderColor: '#2A9D8F',
  },
  segText: {
    fontFamily: 'Helvetica',
    fontSize: 13,
    color: 'rgba(255,255,240,0.55)',
  },
  segTextActive: {
    color: '#FFFFF0',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#1A3828',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    fontFamily: 'Helvetica',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFF0',
  },
});
