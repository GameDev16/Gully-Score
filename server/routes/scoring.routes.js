import { Router } from "express";
import { authRequired, requireScorer } from "../middleware/auth.js";
import {
  setToss,
  submitBall,
  startSecondInnings,
  undoLastBall,
  endMatch,
} from "../controllers/scoring.controller.js";

const r = Router({ mergeParams: true });
r.post("/:matchId/toss", authRequired, requireScorer, setToss);
r.post("/:matchId/ball", authRequired, requireScorer, submitBall);
r.delete("/:matchId/ball/undo", authRequired, requireScorer, undoLastBall);
r.post(
  "/:matchId/innings-start",
  authRequired,
  requireScorer,
  startSecondInnings,
);
r.post("/:matchId/match-end", authRequired, requireScorer, endMatch);
export default r;
