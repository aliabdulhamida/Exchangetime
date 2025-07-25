/** @type {import('next').NextConfig} */

import MiniCssExtractPlugin from 'mini-css-extract-plugin';

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
  webpack: (config, { isServer }) => {
    // Füge MiniCssExtractPlugin nur hinzu, wenn es nicht schon vorhanden ist und nicht im Server-Build
    if (!isServer && !config.plugins.some(p => p.constructor && p.constructor.name === 'MiniCssExtractPlugin')) {
      config.plugins.push(new MiniCssExtractPlugin());
    }
    return config;
  },
}

export default nextConfig
