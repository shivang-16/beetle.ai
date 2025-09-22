/** @type {import('next').NextConfig} */

const nextConfig = {
  // Updated configuration for newer Next.js versions
  serverExternalPackages: ['winston'],
  
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

export default nextConfig;