/** @type {import('next').NextConfig} */

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/blog/esg-investments",
        destination: "/blog/esg-investitionen",
        permanent: true,
      },
    ];
  },
}

export default nextConfig
