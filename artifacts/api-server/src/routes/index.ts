import { Router, type IRouter } from "express";
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

export default router;
