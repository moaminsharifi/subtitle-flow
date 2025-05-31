
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Enables static HTML export
  trailingSlash: true, // Recommended for static exports for consistent URL handling
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Necessary for next/image to work with static exports on GitHub Pages
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
