/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
      {
        protocol: "https",
        hostname: "*.imagekit.io",
      },
      {
        protocol: "https",
        hostname: "imagekit.io",
      },
    ],
    // Allow unoptimized images for better compatibility
    unoptimized: false,
  },
};

export default nextConfig;
