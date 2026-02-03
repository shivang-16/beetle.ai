/** @type {import('next').NextConfig} */
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // Updated configuration for newer Next.js versions
  serverExternalPackages: ['winston'],
  
  // Configure image domains for avatars
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'secure.gravatar.com',
      },
      {
        protocol: 'https',
        hostname: 'bitbucket.org',
      },
      {
        protocol: 'https',
        hostname: '*.bitbucket.org',
      },
    ],
  },
  
  // Configure Better Stack rewrites with proper external destinations
  async rewrites() {
    return [
      {
        source: '/_betterstack/web-vitals',
        destination: 'https://in.logs.betterstack.com/web-vitals',
        basePath: false
      },
      {
        source: '/_betterstack/logs',
        destination: 'https://in.logs.betterstack.com/logs',
        basePath: false
      }
    ];
  },
  
  // Add any other Next.js config options here
};

export default withBundleAnalyzer(nextConfig);