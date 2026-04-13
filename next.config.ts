import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      allowedOrigins: [
        'exponent-spotting-fidelity.ngrok-free.dev',
        '192.168.1.7:3000',
      ],
    },
  },
};

export default nextConfig;
