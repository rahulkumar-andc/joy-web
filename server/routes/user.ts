import { Router } from "express";
import { api } from "@shared/routes";
import { UserController } from "../controllers/userController";
import { requireAuth } from "../middleware/auth";

export const userRouter = Router();

// === PROFILE ROUTES ===
userRouter.get(api.profile.get.path, requireAuth, UserController.getProfile);

userRouter.patch(api.profile.update.path, requireAuth, UserController.updateProfile);

userRouter.post(api.profile.changePassword.path, requireAuth, UserController.changePassword);

// === ADDRESS ROUTES ===
userRouter.get("/api/user/addresses", requireAuth, UserController.getAddresses);

userRouter.post("/api/user/addresses", requireAuth, UserController.createAddress);

userRouter.delete("/api/user/addresses/:id", requireAuth, UserController.deleteAddress);
