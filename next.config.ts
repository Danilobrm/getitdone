import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets phones on the LAN load /_next/* so the page hydrates.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  async headers() {
    return [
      {
        // The browser must always revalidate the worker script itself.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
