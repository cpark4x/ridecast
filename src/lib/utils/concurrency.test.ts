import { describe, it, expect, vi } from 'vitest';
import { mapWithConcurrency } from './concurrency';

describe('mapWithConcurrency', () => {
  it('returns results in input order regardless of completion order', async () => {
    // Tasks that complete in reverse order (task 2 finishes first)
    const tasks = [
      () => new Promise<string>((r) => setTimeout(() => r('a'), 30)),
      () => new Promise<string>((r) => setTimeout(() => r('b'), 20)),
      () => new Promise<string>((r) => setTimeout(() => r('c'), 10)),
    ];

    const results = await mapWithConcurrency(tasks, 3);
    expect(results).toEqual(['a', 'b', 'c']);
  });

  it('respects concurrency limit', async () => {
    let running = 0;
    let maxRunning = 0;

    const createTask = (id: number) => async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 10));
      running--;
      return id;
    };

    const tasks = Array.from({ length: 10 }, (_, i) => createTask(i));
    const results = await mapWithConcurrency(tasks, 3);

    expect(maxRunning).toBeLessThanOrEqual(3);
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('handles empty task array', async () => {
    const results = await mapWithConcurrency<string>([], 5);
    expect(results).toEqual([]);
  });

  it('handles single task', async () => {
    const results = await mapWithConcurrency([() => Promise.resolve('only')], 5);
    expect(results).toEqual(['only']);
  });

  it('propagates errors from tasks', async () => {
    const tasks = [
      () => Promise.resolve('ok'),
      () => Promise.reject(new Error('boom')),
      () => Promise.resolve('unreachable'),
    ];

    await expect(mapWithConcurrency(tasks, 5)).rejects.toThrow('boom');
  });

  it('defaults to concurrency of 5', async () => {
    let running = 0;
    let maxRunning = 0;

    const createTask = () => async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 10));
      running--;
      return true;
    };

    const tasks = Array.from({ length: 20 }, () => createTask());
    await mapWithConcurrency(tasks);

    expect(maxRunning).toBeLessThanOrEqual(5);
  });
});
