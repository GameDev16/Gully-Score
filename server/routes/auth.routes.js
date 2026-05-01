import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  me,
  registerSchema,
  loginSchema,
} from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { authRequired } from "../middleware/auth.js";

const r = Router();
r.post("/register", validate(registerSchema), register);
r.post("/login", validate(loginSchema), login);
r.post("/refresh", refresh);
r.post("/logout", logout);
r.get("/me", authRequired, me);
export default r;
