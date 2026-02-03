/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXTPUBLICBASEURL: process.env.NEXTPUBLICBASEURL,
  },
}

export default nextConfig
