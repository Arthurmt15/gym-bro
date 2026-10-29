/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'static.exercisedb.dev' }]
  }
};

export default nextConfig;
