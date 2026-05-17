import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-7d974382-59a9-4e3a-82f1-eac14e505f14.space-z.ai",
  ],
};

export default nextConfig;
