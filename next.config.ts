import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_LP_API_URL;
    
    // Proxy API requests if API URL is configured
    if (apiUrl) {
      return [
        {
          source: "/api/proxy/:path*",
          destination: `${apiUrl}/:path*`,
        },
      ];
    }
    
    return [];
  },
};

export default nextConfig;
