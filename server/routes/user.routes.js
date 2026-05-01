import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import {
  me,
  updateMe,
  myAssignments,
  myDashboard,
  notifications,
} from "../controllers/user.controller.js";

const r = Router();
r.get("/me", authRequired, me);
r.put("/me", authRequired, updateMe);
r.get("/me/assignments", authRequired, myAssignments);
r.get("/me/dashboard", authRequired, myDashboard);
r.get("/me/notifications", authRequired, notifications);
export default r;

import {
  markNotificationRead,
  markAllRead,
} from "../controllers/user.controller.js";
// ...
r.patch("/me/notifications/:id/read", authRequired, markNotificationRead);
r.patch("/me/notifications/read-all", authRequired, markAllRead);
