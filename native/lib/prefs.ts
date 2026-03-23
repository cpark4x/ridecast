import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFS_KEY = "@ridecast/prefs/v1";

export interface AppPrefs {
  defaultDuration: number;       // minutes — default: 5
  hapticsEnabled: boolean;       // default: true
  notificationsEnabled: boolean; // default: false
  hasSeenOnboarding: boolean;    // default: false
}

export const DEFAULT_PREFS: AppPrefs = {
  defaultDuration: 5,
  hapticsEnabled: true,
  notificationsEnabled: false,
  hasSeenOnboarding: false,
};

export async function getPrefs(): Promise<AppPrefs> {
  try {
    const stored = await AsyncStorage.getItem(PREFS_KEY);
    if (!stored) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(stored) } as AppPrefs;
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function setPrefs(update: Partial<AppPrefs>): Promise<void> {
  const current = await getPrefs();
  const next = { ...current, ...update };
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
}

export async function resetPrefs(): Promise<void> {
  await AsyncStorage.removeItem(PREFS_KEY);
}
