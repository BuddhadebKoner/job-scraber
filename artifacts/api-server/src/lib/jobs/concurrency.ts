/**
 * Tiny promise-concurrency limiter (no external deps).
 * Usage:
 *   const limit = pLimit(2);
 *   await Promise.all(items.map((i) => limit(() => doWork(i))));
 */
export function pLimit(max: number): <T>(fn: () => Promise<T>) => Promise<T> {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    if (active >= max) return;
    const run = queue.shift();
    if (run) run();
  };
  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const start = () => {
        active += 1;
        fn()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            next();
          });
      };
      if (active < max) start();
      else queue.push(start);
    });
}
