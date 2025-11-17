import type { NextConfig } from "next";

const target = (process.env.API_PROXY_TARGET ?? "http://localhost:5174").replace(/\/$/, "");
const prefix = (process.env.API_PROXY_PREFIX ?? "/api/v1").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${target}${prefix}/:path*`,
      },
    ];
  },
};

export default nextConfig;
