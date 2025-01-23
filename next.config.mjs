/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/livematchhub/:path*',
        destination: 'http://localhost:5080/livematchhub/:path*',
      },
    ];
  },
};

export default nextConfig;
