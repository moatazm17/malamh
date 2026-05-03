import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use(
  clerkMiddleware((req) => {
    const host = getClerkProxyHost(req) ?? "";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    // When the frontend uses the Clerk proxy, tokens are signed with the proxy
    // URL as the authorized party. The backend must know the same proxyUrl to
    // verify those tokens — otherwise getAuth(req).userId is always undefined
    // and every protected route returns 401.
    const proxyUrl =
      process.env.NODE_ENV === "production" && host
        ? `${protocol}://${host}/api/__clerk`
        : undefined;
    return {
      publishableKey: publishableKeyFromHost(
        host,
        process.env.CLERK_PUBLISHABLE_KEY,
      ),
      ...(proxyUrl ? { proxyUrl } : {}),
    };
  }),
);

app.use("/api", router);

// App-level JSON error handler — catches body-parser errors (malformed JSON,
// payload too large) that fire before requests ever reach the /api router.
// Without this, Express's default HTML page leaks server file paths in stack
// traces. Only handles /api/* requests; non-API routes fall through.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (!req.originalUrl.startsWith("/api")) {
    next(err);
    return;
  }
  const status: number =
    typeof err?.status === "number" ? err.status :
    typeof err?.statusCode === "number" ? err.statusCode :
    err?.type === "entity.too.large" ? 413 :
    err?.type === "entity.parse.failed" ? 400 :
    500;

  if (status >= 500) {
    logger.error({ err, url: req.originalUrl, method: req.method }, "unhandled API error");
  }

  const message =
    status === 413 ? "Request body too large." :
    status === 400 && err?.type === "entity.parse.failed" ? "Malformed JSON body." :
    status >= 500 ? "Internal server error." :
    (err?.message ?? "Request failed.");

  res.status(status).json({
    error:
      status === 400 ? "BadRequest" :
      status === 413 ? "PayloadTooLarge" :
      status >= 500 ? "InternalError" :
      "Error",
    message,
  });
});

export default app;
