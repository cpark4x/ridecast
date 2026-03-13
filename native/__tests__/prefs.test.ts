import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPrefs, setPrefs, resetPrefs, DEFAULT_PREFS } from "../lib/prefs";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe("getPrefs", () => {
  it("returns DEFAULT_PREFS when nothing is stored", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const prefs = await getPrefs();
    expect(prefs).toEqual(DEFAULT_PREFS);
  });

  it("merges stored values over defaults", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ defaultDuration: 20, hasSeenOnboarding: true }),
    );
    const prefs = await getPrefs();
    expect(prefs.defaultDuration).toBe(20);
    expect(prefs.hasSeenOnboarding).toBe(true);
    expect(prefs.hapticsEnabled).toBe(DEFAULT_PREFS.hapticsEnabled); // default preserved
  });

  it("returns defaults when AsyncStorage throws", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("disk error"));
    const prefs = await getPrefs();
    expect(prefs).toEqual(DEFAULT_PREFS);
  });
});

describe("setPrefs", () => {
  it("merges update into existing prefs and writes to storage", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ defaultDuration: 10 }),
    );
    (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

    await setPrefs({ defaultDuration: 15 });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@ridecast/prefs/v1",
      expect.stringContaining('"defaultDuration":15'),
    );
  });
});

describe("resetPrefs", () => {
  it("removes the storage key", async () => {
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValueOnce(undefined);
    await resetPrefs();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@ridecast/prefs/v1");
  });
});
