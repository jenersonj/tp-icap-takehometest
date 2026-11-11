/** Runs `fn` at most once per `ms`, always including a trailing call after a burst. */
export function throttle<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: A | undefined;
  const run = () => {
    last = Date.now();
    timer = undefined;
    const args = pending!;
    pending = undefined;
    fn(...args);
  };
  const throttled = (...args: A) => {
    pending = args;
    if (timer) return;
    const wait = ms - (Date.now() - last);
    if (wait <= 0) run();
    else timer = setTimeout(run, wait);
  };
  throttled.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    pending = undefined;
  };
  return throttled;
}
