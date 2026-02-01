import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { api } from "@shared/routes";
import { emailService } from "../services/email";
import { authLimiter } from "../middleware/rate-limit";
import { logger } from "../logger";
import { z } from "zod";
import bcrypt from "bcryptjs";

export const authRouter = Router();

// Register
authRouter.post(api.auth.register.path, authLimiter, AuthController.register);

// Verify Email
authRouter.post(api.auth.verifyEmail.path, authLimiter, AuthController.verifyEmail);

// Login
authRouter.post(api.auth.login.path, authLimiter, AuthController.login);

// Logout
authRouter.post(api.auth.logout.path, AuthController.logout);

// Get Current User (Me)
authRouter.get(api.auth.me.path, AuthController.getMe);

// Forgot Password
authRouter.post(api.auth.forgotPassword.path, authLimiter, AuthController.forgotPassword);

// Reset Password
authRouter.post(api.auth.resetPassword.path, authLimiter, AuthController.resetPassword);
