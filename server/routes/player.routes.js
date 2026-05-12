import { Router } from "express";
import {
  detail,
  appearances,
  update,
} from "../controllers/player.controller.js";
import { authRequired } from "../middleware/auth.js";

const r = Router();
r.get("/:id", detail);
r.get("/:id/appearances", appearances);
r.put("/:id", authRequired, update);
export default r;
