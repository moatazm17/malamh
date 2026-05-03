import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";
import healthRouter from "./health";
import authRouter from "./auth";
import facesRouter from "./faces";
import keysRouter from "./keys";
import consentRouter from "./consent";
import userRouter from "./user";
import statsRouter from "./stats";
import activityRouter from "./activity";
import billingRouter from "./billing";
import monitorRouter from "./monitor";
import publicApiRouter from "./public-api";
import webhooksRouter from "./webhooks";
import livenessRouter from "./liveness";
import shareRouter from "./share";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(facesRouter);
router.use(livenessRouter);
router.use(keysRouter);
router.use(consentRouter);
router.use(userRouter);
router.use(statsRouter);
router.use(activityRouter);
router.use(billingRouter);
router.use(monitorRouter);
router.use(publicApiRouter);
router.use(webhooksRouter);
router.use(shareRouter);

// JSON 404 for any unknown /api/* route (replaces Express default HTML page).
router.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "NotFound",
    message: `No API route for ${req.method} ${req.originalUrl}`,
  });
});

// JSON error handler for body-parser errors (e.g. malformed JSON, payload too
// large) and any uncaught route errors. Replaces Express default HTML stack
// trace page that was leaking server file paths.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.use((err: any, req: Request, res: Response, _next: NextFunction) => {
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

export default router;
