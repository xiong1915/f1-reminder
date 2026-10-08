/** @type {import('next').NextConfig} */
const BUILD_ID =
  process.env.NEXT_PUBLIC_BUILD_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  'apex-v3-605c56c';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-APEX-Build',
            value: BUILD_ID,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
