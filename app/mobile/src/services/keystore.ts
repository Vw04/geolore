import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotifSettings = {
  enabled: boolean;
  frequencyMs: 60000 | 300000 | 600000 | 1800000;
  bulletCount: 1 | 2 | 3;
};

export type DisplaySettings = {
  sortOrder: 'distance' | 'notable';
  maxFacts: number; // 1–10
};

const NOTIF_DEFAULTS: NotifSettings = {
  enabled: false,
  frequencyMs: 300000,
  bulletCount: 2,
};

const DISPLAY_DEFAULTS: DisplaySettings = { sortOrder: 'distance', maxFacts: 5 };

const KEYS = {
  apiKey: 'anthropic_api_key',
  onboardingComplete: 'onboarding_complete',
  userInterests: 'user_interests',
  notifSettings: 'notif_settings',
  displaySettings: 'display_settings',
};

export async function getApiKey(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.apiKey);
}

export async function setApiKey(key: string): Promise<void> {
  return AsyncStorage.setItem(KEYS.apiKey, key.trim());
}

export async function clearApiKey(): Promise<void> {
  return AsyncStorage.removeItem(KEYS.apiKey);
}

export async function getOnboardingComplete(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.onboardingComplete);
  return val === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  return AsyncStorage.setItem(KEYS.onboardingComplete, 'true');
}

export async function getUserInterests(): Promise<string[]> {
  const val = await AsyncStorage.getItem(KEYS.userInterests);
  if (!val) return ['All'];
  try { return JSON.parse(val); } catch { return ['All']; }
}

export async function setUserInterests(interests: string[]): Promise<void> {
  return AsyncStorage.setItem(KEYS.userInterests, JSON.stringify(interests));
}

export async function getNotifSettings(): Promise<NotifSettings> {
  const val = await AsyncStorage.getItem(KEYS.notifSettings);
  if (!val) return { ...NOTIF_DEFAULTS };
  try { return { ...NOTIF_DEFAULTS, ...JSON.parse(val) }; } catch { return { ...NOTIF_DEFAULTS }; }
}

export async function setNotifSettings(s: NotifSettings): Promise<void> {
  return AsyncStorage.setItem(KEYS.notifSettings, JSON.stringify(s));
}

export async function getDisplaySettings(): Promise<DisplaySettings> {
  const val = await AsyncStorage.getItem(KEYS.displaySettings);
  if (!val) return { ...DISPLAY_DEFAULTS };
  try { return { ...DISPLAY_DEFAULTS, ...JSON.parse(val) }; } catch { return { ...DISPLAY_DEFAULTS }; }
}

export async function setDisplaySettings(s: DisplaySettings): Promise<void> {
  return AsyncStorage.setItem(KEYS.displaySettings, JSON.stringify(s));
}
