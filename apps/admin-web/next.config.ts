import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@gozaika/supabase", "@gozaika/types", "@gozaika/utils"],
};

export default nextConfig;
