/**
 * OfflineBanner smoke tests.
 *
 * @react-native-community/netinfo is a native module that needs mocking.
 * We verify the component exists and is a function (React component).
 */

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()), // returns unsubscribe fn
    fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const OfflineBannerModule = require("../components/OfflineBanner");

describe("OfflineBanner component", () => {
  it("has a default export", () => {
    expect(OfflineBannerModule.default).toBeDefined();
  });

  it("default export is a React function component", () => {
    expect(typeof OfflineBannerModule.default).toBe("function");
  });
});
