/**
 * Runs an array of async tasks with a concurrency cap.
 * Results are returned in the same order as the input tasks,
 * regardless of completion order.
 *
 * @param tasks   - Array of zero-arg async functions to execute.
 * @param limit   - Maximum number of tasks running concurrently (default: 5).
 * @returns         Ordered array of results.
 */
export async function mapWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit = 5,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const i = nextIndex++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => runNext(),
  );
  await Promise.all(workers);
  return results;
}
