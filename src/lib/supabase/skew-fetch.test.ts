import { describe, expect, it, vi } from "vitest";

import { createSkewTolerantFetch } from "@/lib/supabase/skew-fetch";

const res = (status: number, body: string) => new Response(body, { status });

describe("createSkewTolerantFetch", () => {
  it("retries once on JWT issued at future", async () => {
    const base = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(res(401, '{"message":"JWT issued at future"}'))
      .mockResolvedValueOnce(res(200, "[]"));
    const response = await createSkewTolerantFetch(base, 0)("https://x/rest");
    expect(response.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it("does not retry other 401s or successes", async () => {
    const base = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(res(401, '{"message":"JWT expired"}'))
      .mockResolvedValueOnce(res(200, "[]"));
    const f = createSkewTolerantFetch(base, 0);
    expect((await f("https://x")).status).toBe(401);
    expect((await f("https://x")).status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
  });
});
