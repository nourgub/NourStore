// Production static-file serving — split out from vite.ts specifically so
// this module never imports the "vite" package itself. vite.ts's
// setupVite (dev-only) has a top-level `import ... from "vite"`, and since
// server/_core/index.ts used to import both setupVite and serveStatic
// from the same module, esbuild's bundle (--packages=external) kept that
// import as a real runtime `import "vite"` in dist/index.js — which then
// crashed on startup in ANY environment that correctly installs
// production dependencies only (vite is a devDependency, absent there).
// This was never caught because every test in this project's history
// happened to have devDependencies installed too. Keeping this serving
// logic in its own vite-free module, imported statically, and loading
// setupVite only via a dynamic import gated on NODE_ENV (see index.ts),
// means a production install genuinely never touches the vite package.
import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(
    express.static(distPath, {
      // Real caching, not the framework default (effectively none): Vite
      // gives every built file in /assets a content hash in its filename
      // (e.g. CourseCatalog-BvcYjlq3.js) — a new deploy that changes the
      // file always changes the filename too, so these can be cached
      // essentially forever with zero staleness risk. This matters most
      // on exactly the slow/metered mobile connections this app needs to
      // work well on: a returning visitor re-downloads nothing unchanged.
      // Everything else (index.html, manifest, favicons — anything
      // *without* a content hash in its name) must NOT be cached long
      // term, since it's what points at the current hashed filenames in
      // the first place; caching it long would mean visitors keep
      // loading an old deploy's asset references after a new deploy.
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader(
            "Cache-Control",
            "public, max-age=31536000, immutable"
          );
        } else {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    })
  );

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
