import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/customers/:id/edit',
        destination: '/customers/edit/:id',
      },
      {
        source: '/projects/:id/edit',
        destination: '/projects/edit/:id',
      },
      {
        source: '/purchases/:id/edit',
        destination: '/purchases/edit/:id',
      },
      {
        source: '/suppliers/:id/edit',
        destination: '/suppliers/edit/:id',
      },
      {
        source: '/equipment/:id/edit',
        destination: '/equipment/edit/:id',
      },
      {
        source: '/time-entries/:id/edit',
        destination: '/time-entries/edit/:id',
      },
      {
        source: '/price-library/:id/edit',
        destination: '/price-library/edit/:id',
      },
      {
        source: '/quotes/:id/edit',
        destination: '/quotes/edit/:id',
      },
      {
        source: '/invoices/:id/edit',
        destination: '/invoices/edit/:id',
      },
    ];
  },
};

export default nextConfig;
