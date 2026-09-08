/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse bundles pdfjs-dist, which resolves its Node.js worker file at
  // runtime via require.resolve — bundling it through Turbopack/webpack
  // breaks that lookup, so keep it external and let Node load it directly.
  // better-sqlite3 ships a native .node binary that must stay unbundled too.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "better-sqlite3"],
};

export default nextConfig;
