import { Router } from "express";
import { api } from "@shared/routes";
import { requireAdmin } from "../middleware/auth";
import { upload } from "../upload";
import { CommonController } from "../controllers/commonController";

export const commonRouter = Router();

// === HOMEPAGE ROUTES ===
commonRouter.get(api.homepage.get.path, CommonController.getHomepage);

// === IMAGE UPLOAD ===
commonRouter.post("/api/upload", requireAdmin, upload.single("image"), CommonController.uploadImage);

