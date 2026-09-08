/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse bundles pdfjs-dist, which resolves its Node.js worker file at
  // runtime via require.resolve — bundling it through Turbopack/webpack
  // breaks that lookup, so keep it external and let Node load it directly.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
