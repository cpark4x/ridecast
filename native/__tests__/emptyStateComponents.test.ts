// native/__tests__/emptyStateComponents.test.ts

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NewUserModule     = require("../components/empty-states/NewUserEmptyState");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AllCaughtUpModule = require("../components/empty-states/AllCaughtUpEmptyState");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StaleNudgeModule  = require("../components/empty-states/StaleLibraryNudge");

describe("NewUserEmptyState", () => {
  it("has a default export that is a function", () => {
    expect(typeof NewUserModule.default).toBe("function");
  });
});

describe("AllCaughtUpEmptyState", () => {
  it("has a default export that is a function", () => {
    expect(typeof AllCaughtUpModule.default).toBe("function");
  });
});

describe("StaleLibraryNudge", () => {
  it("has a default export that is a function", () => {
    expect(typeof StaleNudgeModule.default).toBe("function");
  });
});