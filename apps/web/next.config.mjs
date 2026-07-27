/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpila os pacotes do monorepo (código TS não pré-buildado).
  transpilePackages: ['@uniteon/shared', '@uniteon/game', '@uniteon/ui'],
};

export default nextConfig;
