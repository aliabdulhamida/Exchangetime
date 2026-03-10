/** @type {import('next').NextConfig} */

const nextConfig = {
  // Enforce ESLint and TypeScript checks during builds
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    // Workaround for Node 22 + webpack WasmHash crash
    config.output = config.output || {};
    // Use sha256 to avoid wasm hash path entirely
    config.output.hashFunction = 'sha256';
    config.output.hashDigest = 'hex';

    config.optimization = {
      ...(config.optimization || {}),
      // Avoid wasm-based hashing path
      realContentHash: false,
    };

    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: false,
      syncWebAssembly: false,
      layers: true,
    };

    // Prevent flaky filesystem cache artifacts in synced folders during local dev.
    if (dev) {
      config.cache = {
        type: 'memory',
      };
    }

    return config;
  },
  async redirects() {
    return [
      {
        source: '/blog/esg-investments',
        destination: '/blog/esg-investitionen',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
