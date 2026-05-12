import { Router } from "express";
import {
  list,
  detail,
  findByKey,
  liveState,
  create,
  update,
  deleteMatch,
  assignScorer,
} from "../controllers/match.controller.js";
import { authRequired } from "../middleware/auth.js";

const r = Router();
r.get("/", list);
r.get("/key/:matchKey", findByKey);
r.get("/:id/state", liveState);
r.get("/:id", detail);
r.post("/", authRequired, create);
r.put("/:id", authRequired, update);
r.delete("/:id", authRequired, deleteMatch);
r.post("/:id/assign-scorer", authRequired, assignScorer);
export default r;
