import { Router } from "express";
import { list, create } from "../controllers/venue.controller.js";
import { authRequired } from "../middleware/auth.js";

const r = Router();
r.get("/", list);
r.post("/", authRequired, create);
export default r;
