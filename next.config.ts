import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Reescribir /api/iam/* → IAM Core en puerto 4000
  async rewrites() {
    return [
      {
        source:      '/api/iam/:path*',
        destination: `${process.env.IAM_API_URL ?? 'http://localhost:4000/api'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
