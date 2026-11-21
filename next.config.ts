import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Baked at `next build` so the UI can show whether the deploy is fresh.
    NEXT_PUBLIC_APP_BUILT_AT: new Date().toISOString(),
  },
  experimental: {
    // Reuse visited tabs for 30s instead of refetching on every switch.
    // Mutations call revalidatePath, which still clears this cache.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
