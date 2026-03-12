import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import FactCard from './src/components/FactCard';
import BrandLogo from './src/components/BrandLogo';
import SettingsScreen from './src/components/SettingsScreen';
import WelcomeScreen from './src/components/onboarding/WelcomeScreen';
import ApiKeyScreen from './src/components/onboarding/ApiKeyScreen';
import InterestsScreen from './src/components/onboarding/InterestsScreen';
import type { Fact } from './src/types/place';
import { getCurrentLocation } from './src/services/location';
import {
  getOnboardingComplete, setOnboardingComplete, getUserInterests, setUserInterests,
  getNotifSettings, setNotifSettings,
} from './src/services/keystore';
import type { NotifSettings } from './src/services/keystore';
import { fetchNearbyFacts, reverseGeocodeLabel } from './src/services/wikipedia';
import { rankFacts } from './src/services/ranking';
import { synthesizeFacts } from './src/services/synthesis';
import * as Notifications from 'expo-notifications';
import SAMPLE_LOCATIONS from './src/data/sample-locations.json';

const DEV_CITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Tokyo':       { bg: '#2d1040', border: '#9955cc', text: '#cc88ff' },
  'Paris':       { bg: '#2e2a00', border: '#ccaa00', text: '#ffdd44' },
  'Moscow':      { bg: '#e8e8e8', border: '#aaaaaa', text: '#1a1a1a' },
  'Los Angeles': { bg: '#0a1a3a', border: '#4466cc', text: '#88aaff' },
  'Miami':       { bg: '#3a1800', border: '#cc6600', text: '#ffaa44' },
  'Hong Kong':   { bg: '#3a0a0a', border: '#cc3333', text: '#ff7777' },
};

export default function App() {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [status, setStatus] = useState<string>('Tap refresh to discover nearby facts.');
  const [loading, setLoading] = useState<boolean>(false);
  const [radius, setRadius] = useState<number>(5000);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [factCount, setFactCount] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<'checking' | 'welcome' | 'apikey' | 'interests' | null>('checking');
  const [interests, setInterests] = useState<string[]>(['All']);
  const [showSettings, setShowSettings] = useState(false);
  const [notifSettings, setNotifState] = useState<NotifSettings>({ enabled: false, frequencyMs: 300000, bulletCount: 2 });

  useEffect(() => {
    getOnboardingComplete().then((done) => {
      if (done) {
        getUserInterests().then(setInterests);
        getNotifSettings().then(setNotifState);
        setOnboardingStep(null);
      } else {
        setOnboardingStep('welcome');
      }
    });

    // Handle notification taps — bring app to foreground on main screen
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      setShowSettings(false);
      setOnboardingStep(null);
    });
    return () => sub.remove();
  }, []);

  // Recompute factCount whenever radius or facts change
  useEffect(() => {
    if (facts.length > 0) {
      setFactCount(facts.filter((f) => f.distance === 0 || f.distance <= radius).length);
    }
  }, [radius, facts]);

  const hasLoaded = facts.length > 0 || loading;

  const displayedFacts = facts
    .filter((f) => f.distance === 0 || f.distance <= radius)
    .sort((a, b) => a.distance - b.distance);

  const radiusLabel = radius >= 1000
    ? `${(radius / 1000).toFixed(1)} km`
    : `${radius} m`;

  const runWithCoords = async (lat: number, lon: number, label: string) => {
    setLoading(true);
    setCurrentCoords(null);
    setFactCount(null);
    setLocationLabel(null);
    setStatus(`Loading: ${label}`);
    try {
      const [rawFacts, geoLabel] = await Promise.all([
        fetchNearbyFacts(lat, lon),
        reverseGeocodeLabel(lat, lon),
      ]);
      const maxPool = !interests.includes('All') ? 60 : 40;
      const ranked = rankFacts(rawFacts, maxPool);
      const preSort = [...ranked].sort((a, b) => a.distance - b.distance);
      setFacts(preSort);
      setCurrentCoords({ lat, lon });
      setLocationLabel(geoLabel || label);
      const synthesized = await synthesizeFacts(ranked, interests);
      const sorted = [...synthesized].sort((a, b) => a.distance - b.distance);
      setFacts(sorted);
    } catch {
      setStatus('Location Not Found');
      setFacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setCurrentCoords(null);
    setFactCount(null);
    setLocationLabel(null);
    setStatus('Requesting location…');
    try {
      const { latitude, longitude } = await getCurrentLocation();
      await runWithCoords(latitude, longitude, `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } catch {
      setStatus('Location Not Found');
      setFacts([]);
      setLoading(false);
    }
  };

  const finishOnboarding = async (selectedInterests: string[]) => {
    setInterests(selectedInterests);
    await setOnboardingComplete();
    await setUserInterests(selectedInterests);
    setOnboardingStep(null);
  };

  const handleSaveSettings = async (newInterests: string[], newNotif: NotifSettings) => {
    setInterests(newInterests);
    setNotifState(newNotif);
    await setUserInterests(newInterests);
    await setNotifSettings(newNotif);
    setShowSettings(false);
  };

  if (onboardingStep === 'checking') {
    return <View style={{ flex: 1, backgroundColor: '#0D2218' }} />;
  }
  if (onboardingStep === 'welcome') {
    return <WelcomeScreen onNext={() => setOnboardingStep('apikey')} />;
  }
  if (onboardingStep === 'apikey') {
    return <ApiKeyScreen onNext={() => setOnboardingStep('interests')} onBack={() => setOnboardingStep('welcome')} />;
  }
  if (onboardingStep === 'interests') {
    return <InterestsScreen onDone={finishOnboarding} onBack={() => setOnboardingStep('apikey')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {__DEV__ && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.devBar}
          contentContainerStyle={styles.devBarContent}
        >
          <TouchableOpacity
            style={[styles.devButton, { backgroundColor: '#2a1a0a', borderColor: '#cc8844' }]}
            onPress={() => setOnboardingStep('welcome')}
          >
            <Text style={[styles.devLabel, { color: '#ffbb66' }]}>↩ Onboarding</Text>
          </TouchableOpacity>
          {SAMPLE_LOCATIONS.locations.map((loc) => {
            const c = DEV_CITY_COLORS[loc.label];
            return (
              <TouchableOpacity
                key={loc.label}
                style={[styles.devButton, c && { backgroundColor: c.bg, borderColor: c.border }]}
                onPress={() => runWithCoords(loc.lat, loc.lon, loc.label)}
                disabled={loading}
              >
                <Text style={[styles.devLabel, c && { color: c.text }]}>{loc.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={!hasLoaded ? styles.headerWrapperCentered : undefined}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <BrandLogo size="md" />
            <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsBtn}>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRefresh}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Refresh Nearby Facts</Text>
            )}
          </TouchableOpacity>
          {currentCoords && factCount !== null ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${currentCoords.lat},${currentCoords.lon}`)}
            >
              <Text style={styles.statusCoords}>
                {locationLabel ? `${locationLabel} — ` : ''}{currentCoords.lat.toFixed(5)}, {currentCoords.lon.toFixed(5)} — {factCount} facts found
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.status}>{status}</Text>
          )}
          {hasLoaded && (
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Radius: {radiusLabel}</Text>
              <View style={styles.sliderRow}>
                <Text style={styles.sliderEndLabel}>0 m</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={10000}
                  step={100}
                  value={radius}
                  onValueChange={setRadius}
                  minimumTrackTintColor="#2A9D8F"
                  maximumTrackTintColor="#1E5038"
                  thumbTintColor="#FFFFF0"
                />
                <Text style={styles.sliderEndLabel}>10 km</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {hasLoaded && (
        <FlatList
          data={displayedFacts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <FactCard fact={item} />}
        />
      )}

      <SettingsScreen
        visible={showSettings}
        interests={interests}
        notifSettings={notifSettings}
        onSave={handleSaveSettings}
        onClose={() => setShowSettings(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D2218',
  },
  devBar: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: '#050F0A',
  },
  devBarContent: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  devButton: {
    backgroundColor: '#1a3a1a',
    borderWidth: 1,
    borderColor: '#4a7a4a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  devLabel: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#88cc88',
  },
  headerWrapperCentered: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    position: 'relative',
  },
  settingsBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingLeft: 12,
    gap: 4,
  },
  menuLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,240,0.5)',
  },
  button: {
    backgroundColor: '#1A3828',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: 'Helvetica',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    fontFamily: 'Helvetica',
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  statusCoords: {
    fontFamily: 'Helvetica',
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sliderContainer: {
    marginTop: 12,
  },
  sliderLabel: {
    fontFamily: 'Helvetica',
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderEndLabel: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    width: 32,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: 32,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});
