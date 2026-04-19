import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@gozaika/config',
    '@gozaika/db',
    '@gozaika/logger',
    '@gozaika/types',
    '@gozaika/utils',
  ],
  async redirects() {
    return [
      {
        source: '/privacy',
        destination: '/privacy-policy',
        permanent: true,
      },
      {
        source: '/terms',
        destination: '/terms-of-service',
        permanent: true,
      },
      {
        source: '/refund',
        destination: '/refund-policy',
        permanent: true,
      },
      {
        source: '/cancellation-policy',
        destination: '/refund-policy',
        permanent: true,
      },
      {
        source: '/food-safety',
        destination: '/food-safety-policy',
        permanent: true,
      },
      {
        source: '/grievance',
        destination: '/grievance-redressal',
        permanent: true,
      },
      {
        source: '/restaurants',
        destination: '/for-restaurants',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
