/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for lean Railway / Docker deploys
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: [
      "pdf-parse",
      "pdfjs-dist",
      // Ships a native skia .node binary that webpack cannot parse.
      "@napi-rs/canvas",
      "sharp",
      "@remotion/renderer",
      "@remotion/bundler",
      "ffmpeg-static",
      "better-sqlite3",
    ],
  },
};

module.exports = nextConfig;
