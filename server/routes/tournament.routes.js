import { Router } from "express";
import {
  list,
  detail,
  findByCode,
  create,
  update,
  remove,
  pointsTable,
} from "../controllers/tournament.controller.js";
import { authRequired } from "../middleware/auth.js";

const r = Router();
r.get("/", list);
r.get("/code/:code", findByCode);
r.get("/:id", detail);
r.get("/:id/points-table", pointsTable);
r.post("/", authRequired, create);
r.put("/:id", authRequired, update);
r.delete("/:id", authRequired, remove);
export default r;
