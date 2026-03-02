import { describe, it, expect, vi } from "vitest";

// Mock Dexie as an extendable class for Node.js test environment
vi.mock("dexie", () => {
  const store: Record<string, { id: string; data: ArrayBuffer }> = {};

  class MockDexie {
    audioCache = {
      get: (key: string) =>
        Promise.resolve(store[key] ? { id: key, data: store[key].data } : undefined),
      put: (item: { id: string; data: ArrayBuffer; cachedAt: number }) => {
        store[item.id] = item;
        return Promise.resolve(item.id);
      },
      delete: (key: string) => {
        delete store[key];
        return Promise.resolve();
      },
    };

    version(_n: number) {
      return { stores: (_schema: Record<string, string>) => this };
    }
  }

  return { default: MockDexie };
});

import { cacheAudio, getCachedAudio, removeCachedAudio } from "./cache";

describe("Audio cache", () => {
  it("caches and retrieves audio data", async () => {
    const data = new ArrayBuffer(10);
    await cacheAudio("audio-1", data);
    const cached = await getCachedAudio("audio-1");
    expect(cached).toBeDefined();
  });

  it("returns undefined for uncached audio", async () => {
    const cached = await getCachedAudio("nonexistent");
    expect(cached).toBeUndefined();
  });
});
