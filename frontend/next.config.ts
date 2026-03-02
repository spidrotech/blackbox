import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/invoices/:id/edit',
        destination: '/invoices/edit/:id',
      },
    ];
  },
};

export default nextConfig;
