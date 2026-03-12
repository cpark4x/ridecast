/**
 * CarPlay module tests.
 *
 * @g4rb4g3/react-native-carplay is mapped to a Jest stub via moduleNameMapper
 * (see package.json), so require() inside initializeCarPlay() succeeds without
 * needing a real Xcode-linked native module.
 */

// Mock SQLite-backed modules so no Expo native modules are loaded
jest.mock("../lib/db");
jest.mock("../lib/libraryHelpers");

import { isCarPlayAvailable, initializeCarPlay } from "../lib/carplay";

// Reference the stub so we can assert on it
// eslint-disable-next-line @typescript-eslint/no-require-imports
const carplayStub = require("@g4rb4g3/react-native-carplay") as {
  CarPlay: { emitter: { addListener: jest.Mock }; setRootTemplate: jest.Mock };
};

describe("CarPlay module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("isCarPlayAvailable() returns false before any connect event", () => {
    expect(isCarPlayAvailable()).toBe(false);
  });

  it("initializeCarPlay() resolves without throwing", async () => {
    await expect(initializeCarPlay()).resolves.toBeUndefined();
  });

  it("isCarPlayAvailable() stays false after initializeCarPlay() — didConnect never fired", async () => {
    await initializeCarPlay();
    expect(isCarPlayAvailable()).toBe(false);
  });

  it("initializeCarPlay() registers didConnect and didDisconnect listeners", async () => {
    await initializeCarPlay();
    const registeredEvents = carplayStub.CarPlay.emitter.addListener.mock.calls.map(
      (c: unknown[]) => c[0],
    );
    expect(registeredEvents).toContain("didConnect");
    expect(registeredEvents).toContain("didDisconnect");
  });
});
