/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "pdf-parse",
      "@remotion/renderer",
      "@remotion/bundler",
      "ffmpeg-static",
      "better-sqlite3",
    ],
  },
};

module.exports = nextConfig;
