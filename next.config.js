/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */

/** @type {import('next').NextConfig} */

import './src/env.js';

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;
