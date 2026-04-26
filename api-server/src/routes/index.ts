import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiProxyRouter from "./ai-proxy";
import { terminalRouter } from "./terminal";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiProxyRouter);
router.use(terminalRouter);

export default router;
