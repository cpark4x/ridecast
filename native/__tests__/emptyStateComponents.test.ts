// native/__tests__/emptyStateComponents.test.ts

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NewUserModule     = require("../components/empty-states/NewUserEmptyState");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AllCaughtUpModule = require("../components/empty-states/AllCaughtUpEmptyState");
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

