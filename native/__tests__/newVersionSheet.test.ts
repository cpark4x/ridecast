/**
 * NewVersionSheet smoke tests.
 *
 * NewVersionSheet imports expo-router which pulls in @react-navigation/native
 * as an ES module — we mock it so Jest can load the component as CJS.
 */

// Must be before any import that transitively loads expo-router
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@react-native-community/slider", () => "Slider");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NewVersionSheetModule = require("../components/NewVersionSheet");

describe("NewVersionSheet component", () => {
  it("has a default export", () => {
    expect(NewVersionSheetModule.default).toBeDefined();
  });

  it("default export is a React function component", () => {
    expect(typeof NewVersionSheetModule.default).toBe("function");
  });
});
