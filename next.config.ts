import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deliberately NOT setting typescript.ignoreBuildErrors or
  // eslint.ignoreDuringBuilds -- per CLAUDE.md, a failing check is fixed, not
  // silenced.
  images: {
    remotePatterns: [
      {
        // Amazon's product image CDN -- real product photography from the
        // Amazon Reviews 2023 dataset (McAuley Lab), used by the seed script.
        // Publicly cacheable, no hotlink protection (verified: permissive
        // CORS, 20-year cache headers).
        protocol: "https",
        hostname: "m.media-amazon.com",
      },
    ],
  },
};

export default nextConfig;
