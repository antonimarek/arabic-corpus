import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Baked at `next build` so the UI can show whether the deploy is fresh.
    NEXT_PUBLIC_APP_BUILT_AT: new Date().toISOString(),
  },
};

export default nextConfig;
