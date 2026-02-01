import { Request, Response } from "express";
import { userRepository } from "../repositories/userRepository";
import { addressRepository } from "../repositories/addressRepository";
import { wishlistRepository } from "../repositories/wishlistRepository";
import { api } from "@shared/routes";
import { insertAddressSchema } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { verificationRepository } from "../repositories/verificationRepository";
import { emailService } from "../services/email";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function verifyPassword(password: string, hash: string) {
    const [hashed, salt] = hash.split(".");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return buf.toString("hex") === hashed;
}

export class UserController {
    static getProfile = catchAsync(async (req: Request, res: Response) => {
        const user = await userRepository.findById((req.user as any).id);
        if (!user) throw new AppError("User not found", 401);

        // Fetch reseller status
        // We use dynamic import to avoid circular dependency if any, or just to keep it clean like OrderController
        let resellerInfo = null;
        try {
            const { resellerService } = await import("../modules/reseller/reseller.service");
            const reseller = await resellerService.getResellerByUserId(user.id);
            if (reseller) {
                resellerInfo = {
                    isReseller: true,
                    resellerStatus: reseller.status,
                    resellerId: reseller.id
                };
            } else {
                resellerInfo = {
                    isReseller: false,
                    resellerStatus: null,
                    resellerId: null
                };
            }
        } catch (err) {
            // If reseller module fails, just return user info without blocking
            resellerInfo = { isReseller: false, error: "Failed to fetch reseller info" };
        }

        res.json({ ...user, ...resellerInfo });
    });

    static updateProfile = catchAsync(async (req: Request, res: Response) => {
        const userData = api.profile.update.input.parse(req.body);
        const updated = await userRepository.update((req.user as any).id, userData);
        res.json(updated);
    });

    static changePassword = catchAsync(async (req: Request, res: Response) => {
        const { currentPassword, newPassword } = api.profile.changePassword.input.parse(req.body);

        // Verify current password
        const user = await userRepository.findById((req.user as any).id);

        if (!user) throw new AppError("User not found", 404);

        const isValid = await verifyPassword(currentPassword, user.password);
        if (!isValid) throw new AppError("Current password is incorrect", 400);

        const hashedPassword = await hashPassword(newPassword);
        await userRepository.updatePassword(user.id, hashedPassword);

        // Invalidate all other sessions
        await userRepository.invalidateUserSessions(user.id);

        res.json({ message: "Password updated successfully" });
    });

    static forgotPassword = catchAsync(async (req: Request, res: Response) => {
        const { email } = api.auth.forgotPassword.input.parse(req.body);
        const user = await userRepository.findByUsername(email);

        if (!user) throw new AppError("User not found", 404);

        const token = await userRepository.createPasswordResetToken(user.id);

        // In a real app, send this via email
        // For now, return it for testing
        // TODO: Integrate Email Service

        res.json({ message: "Password reset link sent", token });
    });

    static resetPassword = catchAsync(async (req: Request, res: Response) => {
        const { token, password } = api.auth.resetPassword.input.parse(req.body);

        const resetToken = await userRepository.validateResetToken(token);
        if (!resetToken) throw new AppError("Invalid or expired token", 400);

        // Explicitly cast to any or a type that includes userId because we modified the repository return
        const userId = (resetToken as any).userId;

        const hashedPassword = await hashPassword(password);
        await userRepository.updatePassword(userId, hashedPassword);
        await userRepository.deleteResetToken(token);

        res.json({ message: "Password reset successfully" });
    });

    // Address methods
    static getAddresses = catchAsync(async (req: Request, res: Response) => {
        const userId = (req.user as any).id;
        const addresses = await addressRepository.getAddresses(userId);
        res.json(addresses);
    });

    static createAddress = catchAsync(async (req: Request, res: Response) => {
        const input = insertAddressSchema.parse({ ...req.body, userId: (req.user as any).id });
        const address = await addressRepository.create(input);
        res.status(201).json(address);
    });

    static deleteAddress = catchAsync(async (req: Request, res: Response) => {
        const userId = (req.user as any).id;
        const addressId = parseInt(req.params.id as string);
        await addressRepository.delete(userId, addressId);
        res.status(204).send();
    });

    // Wishlist methods
    static getWishlist = catchAsync(async (req: Request, res: Response) => {
        const items = await wishlistRepository.getWishlist((req.user as any).id);
        res.json(items.map((i: any) => ({ item: i, product: i.product })));
    });

    static addToWishlist = catchAsync(async (req: Request, res: Response) => {
        const { productId } = api.wishlist.add.input.parse(req.body);
        const item = await wishlistRepository.addToWishlist((req.user as any).id, productId);
        res.json(item);
    });

    static removeFromWishlist = catchAsync(async (req: Request, res: Response) => {
        await wishlistRepository.removeFromWishlist((req.user as any).id, parseInt(req.params.productId as string));
        res.status(204).send();
    });

    static checkWishlist = catchAsync(async (req: Request, res: Response) => {
        const inWishlist = await wishlistRepository.isInWishlist((req.user as any).id, parseInt(req.params.productId as string));
        res.json({ inWishlist });
    });
}
