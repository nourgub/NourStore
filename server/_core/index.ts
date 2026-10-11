import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerGoogleAuthRoutes } from "./googleAuth";
import { registerProtectedFileRoutes } from "../protectedFiles";
import { registerTafawoqTtsRoutes } from "../tafawoq/ttsRoute";
import { appRouter } from "../routers";
import { getDb } from "../db/shared";
import { logError, isUnexpectedError } from "../db/errorLog";
import { checkRateLimit } from "../rateLimit";
import { createContext } from "./context";
import { serveStatic } from "./staticServe";
import { assertEnvOrExit } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Fails fast and loudly on insecure/nonsensical configuration instead of
  // serving traffic in a broken state that only surfaces later via
  // /api/health or a confusing runtime error. See server/_core/env.ts.
  assertEnvOrExit();
  const app = express();
  // Trust exactly one reverse-proxy hop (Replit's / any standard PaaS
  // front door) so Express's own req.ip resolves the real client IP from
  // the X-Forwarded-For header's right-most (proxy-appended) entry —
  // never the client-supplied left-most entries, which a caller can set
  // to anything. Rate-limit keys below use req.ip specifically so they
  // can't be reset by an attacker just sending a different
  // X-Forwarded-For value on every request.
  app.set("trust proxy", 1);
  const server = createServer(app);
  // JSON bodies up to 12 MB: the largest request is a student's photo of an
  // exercise (6 MB, base64-encoded — see MAX_EXERCISE_IMAGE_BYTES in
  // server/tafawoq/service.ts).
  app.use(express.json({ limit: "12mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  registerGoogleAuthRoutes(app);
  registerProtectedFileRoutes(app);
  registerTafawoqTtsRoutes(app);
  // Real health check for load balancers / uptime monitors / container
  // orchestration — actually verifies database connectivity rather than
  // just returning 200 unconditionally, so a broken DB connection shows up
  // as an unhealthy instance instead of masking the problem.
  app.get("/api/health", async (_req, res) => {
    const db = await getDb();
    if (!db) {
      res.status(503).json({ status: "degraded", database: "unavailable" });
      return;
    }
    try {
      await db.execute("SELECT 1");
      res.status(200).json({ status: "ok", database: "connected" });
    } catch (error) {
      res.status(503).json({ status: "degraded", database: "error" });
    }
  });
  // Plain REST (not tRPC) so it works even if the tRPC client itself
  // failed to load — the one place robustness matters more than type
  // safety, since this is what reports "the app is already broken."
  app.post("/api/report-error", async (req, res) => {
    const rateLimitKey = `frontend-error-report:${req.ip || "unknown"}`;
    if (!(await checkRateLimit(rateLimitKey, 30, 60 * 60 * 1000))) {
      res.status(200).json({ ok: true }); // never surface a 2nd error from the error reporter itself
      return;
    }
    const body = req.body as {
      message?: string;
      stack?: string;
      context?: string;
    };
    await logError({
      source: "frontend",
      message: String(body.message || "Unknown error").slice(0, 2000),
      stack: body.stack ? String(body.stack).slice(0, 8000) : undefined,
      context: body.context ? String(body.context).slice(0, 255) : undefined,
      userAgent: req.headers["user-agent"],
    });
    res.status(200).json({ ok: true });
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      // Real, self-hosted error tracking (unlike Sentry, needs no external
      // account) — captures every genuinely unexpected error across the
      // entire tRPC surface in one place, rather than needing individual
      // try/catch logging in each of the app's 118+ endpoints. Expected
      // rejections (bad input, auth failures, not-found, etc.) are
      // filtered out by isUnexpectedError so this table stays a signal.
      onError({ error, path, ctx }) {
        if (!isUnexpectedError(error)) return;
        void logError({
          source: "backend",
          message: error.message,
          stack: error.stack,
          context: path,
          userId: (ctx as { user?: { id: number } } | undefined)?.user?.id,
        });
      },
    })
  );
  // development mode uses Vite, production mode uses static files. The
  // dev-only module is loaded with a dynamic import specifically so a
  // production install — where "vite" (a devDependency) is correctly not
  // installed — never tries to resolve it at all. See staticServe.ts's
  // header comment for why this used to crash production startups.
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./viteDevServer");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
