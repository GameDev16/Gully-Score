import { Router } from "express";
import {
  detail,
  create,
  update,
  addPlayer,
  removePlayer,
} from "../controllers/team.controller.js";
import { authRequired } from "../middleware/auth.js";

const r = Router();
r.get("/:id", detail);
r.post("/", authRequired, create);
r.put("/:id", authRequired, update);
r.post("/:id/players", authRequired, addPlayer);
r.delete("/:id/players/:pid", authRequired, removePlayer);
export default r;
