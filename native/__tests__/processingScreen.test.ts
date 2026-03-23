import { getStageIndex, STAGE_LABELS } from "../lib/constants";
import type { ProcessingStage } from "../lib/constants";

describe("getStageIndex", () => {
  const cases: [ProcessingStage, number][] = [
    ["analyzing", 0],
    ["scripting", 1],
    ["generating", 2],
    ["ready", 3],
  ];

  it.each(cases)("stage '%s' has index %i", (stage, expected) => {
    expect(getStageIndex(stage)).toBe(expected);
  });
});

describe("STAGE_LABELS", () => {
  it("has 4 entries", () => {
    expect(STAGE_LABELS).toHaveLength(4);
  });

  it("first stage is analyzing", () => {
    expect(STAGE_LABELS[0].stage).toBe("analyzing");
  });

  it("last stage is ready", () => {
    expect(STAGE_LABELS[3].stage).toBe("ready");
  });

  it("each entry has stage, label, and icon fields", () => {
    for (const entry of STAGE_LABELS) {
      expect(entry).toHaveProperty("stage");
      expect(entry).toHaveProperty("label");
      expect(entry).toHaveProperty("icon");
    }
  });
});
