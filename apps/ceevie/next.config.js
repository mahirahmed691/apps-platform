const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: trace dependencies from repo root (packages/app-core).
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

module.exports = nextConfig;
