/**
 * EmptyState component smoke tests.
 * The file doesn't exist yet → module-not-found error = RED.
 * After implementation the import resolves and the export is a function = GREEN.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const EmptyStateModule = require("../components/EmptyState");

describe("EmptyState component", () => {
  it("has a default export", () => {
    expect(EmptyStateModule.default).toBeDefined();
  });

  it("default export is a React function component", () => {
    expect(typeof EmptyStateModule.default).toBe("function");
  });
});
