import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@gozaika/config",
    "@gozaika/db",
    "@gozaika/supabase",
    "@gozaika/types",
    "@gozaika/ui",
    "@gozaika/utils",
  ],
};

export default nextConfig;
