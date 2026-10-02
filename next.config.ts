import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deliberately NOT setting typescript.ignoreBuildErrors or
  // eslint.ignoreDuringBuilds -- per CLAUDE.md, a failing check is fixed, not
  // silenced.
  images: {
    remotePatterns: [
      {
        // Lorem Picsum: free placeholder photography used by the seed script.
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        // Picsum redirects to this host when serving the actual image.
        protocol: "https",
        hostname: "fastly.picsum.photos",
      },
    ],
  },
};

export default nextConfig;
