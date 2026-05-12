import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { uploadImage } from "../controllers/upload.controller.js";

const r = Router();
r.post("/image", authRequired, upload.single("file"), uploadImage);
export default r;
