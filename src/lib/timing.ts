/**
 * Lightweight server timing, printed to the runtime logs so slow pages and
 * queries are visible in Vercel. Grep the logs for "[timing]".
 */
const SLOW_MS = 300;

function log(kind: string, label: string, ms: number, extra = "") {
  const flag = ms >= SLOW_MS ? " SLOW" : "";
  console.log(`[timing] ${kind} ${label} ${Math.round(ms)}ms${extra}${flag}`);
}

/** Wraps a fetch so every Supabase request logs its method, path and duration. */
export function createTimedFetch(baseFetch: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const start = performance.now();
    const response = await baseFetch(input, init);
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
    );
    const table = url.pathname.replace(/^\/(rest|auth|storage)\/v1/, "$1:");
    log("query", `${init?.method ?? "GET"} ${table}`, performance.now() - start, ` ${response.status}`);
    return response;
  };
}

/** Wraps an async Server Component page and logs how long it took to render. */
export function timedPage<P>(route: string, Page: (props: P) => Promise<React.ReactNode>) {
  return async function TimedPage(props: P) {
    const start = performance.now();
    try {
      return await Page(props);
    } finally {
      log("page", route, performance.now() - start);
    }
  };
}

export async function timed<T>(label: string, work: Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await work;
  } finally {
    log("step", label, performance.now() - start);
  }
}
