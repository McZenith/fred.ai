/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/livematchhub/:path*',
        destination: 'http://localhost:5113/livematchhub/:path*',
      },
    ];
  },
};

export default nextConfig;
