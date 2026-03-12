# Feature: Settings & Onboarding Polish

> Add missing settings (default duration, notification preferences), first-run tutorial hints, and general settings screen cleanup (GitHub #39).

## Motivation

The settings screen is sparse and missing options users expect. New users have no in-app guidance about the core "paste URL → episode" flow. Adding a sensible settings surface and lightweight first-run hints removes the "what do I do now?" confusion without a heavy onboarding wizard.

## Changes

### 1. Read current settings screen

Read `native/app/settings.tsx` before implementing. Identify what's there, what's missing, and what can be improved.

### 2. Add missing settings

**Default Episode Duration** — shown when creating a new episode, this is the default duration pre-selected in `DurationPicker`:

```typescript
// native/lib/prefs.ts — new preferences module
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFS_KEY = "@ridecast/prefs";

interface AppPrefs {
  defaultDuration: number;       // minutes: 5, 10, 15, 20, 30
  hapticsEnabled: boolean;       // default: true
  notificationsEnabled: boolean; // default: true (if granted)
  hasSeenOnboarding: boolean;    // default: false
}

const DEFAULT_PREFS: AppPrefs = {
  defaultDuration: 10,
  hapticsEnabled: true,
  notificationsEnabled: true,
  hasSeenOnboarding: false,
};

export async function getPrefs(): Promise<AppPrefs> {
  const stored = await AsyncStorage.getItem(PREFS_KEY);
  return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : DEFAULT_PREFS;
}

export async function setPrefs(update: Partial<AppPrefs>): Promise<void> {
  const current = await getPrefs();
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...update }));
}
```

**Notification Preferences** — toggle for episode-ready push notifications:

```typescript
import * as Notifications from "expo-notifications";

async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}
```

### 3. Settings screen layout (`native/app/settings.tsx`)

Updated sections:

```
Settings
├── PLAYBACK
│   ├── Default Duration    [10 min ▾]
│   └── Haptic Feedback     [toggle]
├── NOTIFICATIONS
│   └── Episode Ready       [toggle]
├── ACCOUNT
│   ├── [User avatar + name + email]
│   └── Sign Out
├── STORAGE
│   ├── Downloaded Episodes  [N files, X MB]
│   └── Clear Downloads      [button]
└── ABOUT
    ├── Version              [1.0.0 (42)]
    └── Privacy Policy
```

```typescript
// Settings screen structure
export default function SettingsScreen() {
  const [prefs, setPrefsState] = useState<AppPrefs>(DEFAULT_PREFS);

  useEffect(() => { getPrefs().then(setPrefsState); }, []);

  async function updatePref<K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) {
    await setPrefs({ [key]: value });
    setPrefsState(prev => ({ ...prev, [key]: value }));
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Settings</Text>
        </View>

        {/* Playback section */}
        <SettingsSection title="Playback">
          <SettingsRow label="Default Duration" onPress={handleDefaultDurationPress}>
            <Text className="text-sm text-gray-500">{prefs.defaultDuration} min</Text>
          </SettingsRow>
          <SettingsToggleRow
            label="Haptic Feedback"
            value={prefs.hapticsEnabled}
            onChange={(v) => updatePref("hapticsEnabled", v)}
          />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications">
          <SettingsToggleRow
            label="Episode Ready"
            subtitle="Notify me when an episode finishes generating"
            value={prefs.notificationsEnabled}
            onChange={async (v) => {
              if (v) {
                const granted = await requestNotificationPermission();
                if (!granted) return; // show system dialog, don't flip toggle if denied
              }
              updatePref("notificationsEnabled", v);
            }}
          />
        </SettingsSection>

        {/* Account + Storage + About sections... */}
      </ScrollView>
    </SafeAreaView>
  );
}
```

### 4. Wire `defaultDuration` into DurationPicker

In `UploadModal.tsx` (or wherever `DurationPicker` is initialized):

```typescript
const [duration, setDuration] = useState<number>(10); // current hardcoded default

// Change to:
const [duration, setDuration] = useState<number>(10);
useEffect(() => {
  getPrefs().then(p => setDuration(p.defaultDuration));
}, []);
```

### 5. First-run tutorial hints

Rather than a blocking onboarding flow, use **tooltip-style hints** that appear once and then disappear.

Use `prefs.hasSeenOnboarding` to gate hints:

```typescript
// In HomeScreen, after first sync completes:
const [showHint, setShowHint] = useState(false);

useEffect(() => {
  getPrefs().then(p => {
    if (!p.hasSeenOnboarding && episodes.length === 0) {
      setShowHint(true);
    }
  });
}, [episodes]);

// Hint: tooltip pointing to the FAB
{showHint && (
  <View className="absolute bottom-24 right-4 bg-gray-900 rounded-xl px-3 py-2 max-w-48">
    <Text className="text-xs text-white">Tap + to add your first episode</Text>
    {/* Arrow pointing down-right */}
    <View className="absolute bottom-0 right-4 w-2 h-2 bg-gray-900 rotate-45 translate-y-1" />
  </View>
)}
```

Dismiss the hint (and mark onboarding seen) when user taps the FAB or creates their first episode:

```typescript
async function dismissOnboarding() {
  setShowHint(false);
  await setPrefs({ hasSeenOnboarding: true });
}
```

### 6. SettingsRow and SettingsSection helper components

Extract reusable UI components to avoid repetition:

```typescript
// native/components/settings/SettingsSection.tsx
function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-6">
      <Text className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{title}</Text>
      <View className="bg-white mx-4 rounded-2xl overflow-hidden border border-gray-100">{children}</View>
    </View>
  );
}

// native/components/settings/SettingsToggleRow.tsx
function SettingsToggleRow({ label, subtitle, value, onChange }: ...) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <View className="flex-1">
        <Text className="text-base text-gray-900">{label}</Text>
        {subtitle && <Text className="text-xs text-gray-400 mt-0.5">{subtitle}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: "#EA580C" }} />
    </View>
  );
}
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/settings.tsx` | Rebuild with sections: Playback, Notifications, Account, Storage, About |
| `native/lib/prefs.ts` | New — AsyncStorage-backed preferences module |
| `native/components/settings/SettingsSection.tsx` | New — reusable settings section wrapper |
| `native/components/settings/SettingsToggleRow.tsx` | New — toggle row component |
| `native/components/UploadModal.tsx` | Read `defaultDuration` pref to initialize DurationPicker |
| `native/app/(tabs)/index.tsx` | First-run hint tooltip on FAB |

## Tests

Manual verification:
- [ ] Default duration set to 15 min → new episode DurationPicker opens on 15
- [ ] Haptics toggle off → no haptic feedback anywhere in app
- [ ] Notifications toggle: tapping on fires system permission dialog on first enable
- [ ] First launch (no episodes, `hasSeenOnboarding: false`): tooltip appears near FAB
- [ ] After tapping FAB: tooltip disappears, never shown again

## Success Criteria

```bash
cd native && npx tsc --noEmit
```

- Settings screen renders all sections without crashes
- Prefs persist between app restarts

## Scope

- **No** iCloud/server sync of preferences — AsyncStorage local only
- **No** user-configurable voice selection (that's a separate feature)
- **No** interactive tutorial/tour — tooltip-style hints only
- Haptics toggle wires into the `Haptics` wrapper module from `haptic-feedback` spec
