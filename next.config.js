/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // keep the Postgres driver out of the bundle (needed on Vercel)
    serverComponentsExternalPackages: ['pg'],
  },
};

module.exports = nextConfig;
