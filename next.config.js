/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for lean Railway / Docker deploys
  output: "standalone",
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
