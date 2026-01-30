import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { users } from "@shared/schema";
import { api } from "@shared/routes";
import { userRepository } from "../repositories/userRepository";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function comparePassword(storedPassword: string, suppliedPassword: string) {
    const [hashed, salt] = storedPassword.split(".");
    const buf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
    return buf.toString("hex") === hashed;
}

import { verificationRepository } from "../repositories/verificationRepository";
import { emailService } from "../services/email";

export class AuthController {
    static register = catchAsync(async (req: Request, res: Response) => {
        const existing = await userRepository.findByUsername(req.body.username);
        if (existing) {
            throw new AppError("Email already in use", 400);
        }

        const userData = api.auth.register.input.parse(req.body);
        const hashedPassword = await hashPassword(userData.password);

        const user = await userRepository.create({
            ...userData,
            password: hashedPassword,
            role: "user",
            isVerified: false,
        });

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await hashPassword(otp);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await verificationRepository.create({
            identifier: user.email,
            token: hashedOtp,
            type: "EMAIL_VERIFICATION",
            expiresAt
        });

        await emailService.sendVerificationEmail(user.email, otp);

        res.status(200).json({
            message: "Registration successful. Please check your email for verification code.",
            userId: user.id
        });
    });

    static verifyEmail = catchAsync(async (req: Request, res: Response) => {
        const { email, otp } = req.body;
        if (!email || !otp) throw new AppError("Email and OTP are required", 400);

        const record = await verificationRepository.findValidToken(email, "EMAIL_VERIFICATION");
        if (!record) {
            throw new AppError("Invalid or expired verification code", 400);
        }

        const isValid = await comparePassword(record.token, otp);
        if (!isValid) {
            await verificationRepository.incrementAttempts(record.id);
            throw new AppError("Invalid verification code", 400);
        }

        // Activate user
        const user = await userRepository.findByUsername(email);
        if (!user) throw new AppError("User not found", 404);

        await verificationRepository.delete(record.id);

        // Robust Direct Update
        await db.update(users).set({ isVerified: true }).where(eq(users.id, user.id));

        res.status(200).json({ message: "Email verified successfully. You can now login." });
    });

    static forgotPassword = catchAsync(async (req: Request, res: Response) => {
        const { email } = req.body;
        const user = await userRepository.findByUsername(email);

        // Always return success to prevent email enum
        if (user) {
            const token = randomBytes(32).toString("hex");
            const hashedToken = await hashPassword(token);
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

            // Delete old tokens? optional but good hygiene
            await verificationRepository.deleteByIdentifier(email, "PASSWORD_RESET");

            await verificationRepository.create({
                identifier: email,
                token: hashedToken,
                type: "PASSWORD_RESET",
                expiresAt
            });

            await emailService.sendPasswordReset({ email: user.email, name: user.name }, token);
        }

        res.json({ message: "If an account exists, a reset link has been sent." });
    });

    static resetPassword = catchAsync(async (req: Request, res: Response) => {
        const { email, token, newPassword } = req.body;
        if (!email || !token || !newPassword) {
            throw new AppError("Missing credentials", 400);
        }

        const record = await verificationRepository.findValidToken(email, "PASSWORD_RESET");
        if (!record) throw new AppError("Invalid or expired link", 400);

        const isValid = await comparePassword(record.token, token);
        if (!isValid) throw new AppError("Invalid token", 400);

        const user = await userRepository.findByUsername(email);
        if (!user) throw new AppError("User not found", 404);

        const hashedPassword = await hashPassword(newPassword);
        await userRepository.updatePassword(user.id, hashedPassword);

        await verificationRepository.delete(record.id);

        res.json({ message: "Password reset successfully. You can now login with your new password." });
    });

    static login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        // Validate input
        api.auth.login.input.parse(req.body);

        passport.authenticate("local", (err: any, user: any, info: any) => {
            if (err) return next(err); // Will be caught by global error handler
            if (!user) return next(new AppError(info?.message || "Invalid credentials", 401));

            if (!user.isVerified) {
                return next(new AppError("Email not verified. Please verify your email first.", 403));
            }

            req.login(user, (err) => {
                if (err) return next(new AppError("Login failed", 500));
                res.json(user);
            });
        })(req, res, next);
    });

    static logout = catchAsync(async (req: Request, res: Response) => {
        req.logout((err) => {
            if (err) throw new AppError("Logout failed", 500);
            res.sendStatus(200);
        });
    });

    static getMe = catchAsync(async (req: Request, res: Response) => {
        if (!req.isAuthenticated()) return res.json(null);
        res.json(req.user);
    });
}
